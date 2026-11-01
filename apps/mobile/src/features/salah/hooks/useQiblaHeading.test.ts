import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { Accelerometer, Magnetometer } from 'expo-sensors';

import { LANDSCAPE_PHONE, resetWindowSize, setWindowSize } from '../../../../jest/window-size';

import {
  ALIGNED_ENTER_DEGREES,
  ALIGNED_LEAVE_DEGREES,
  DEVICE_TOP,
  needleAngleFor,
  nextAligned,
  normalize180,
  normalize360,
  removeQuietly,
  screenTurnDegrees,
  screenUpAxis,
  shortestTurn,
  topEdgeAzimuth,
  useQiblaHeading,
  type Vec3,
} from './useQiblaHeading';

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  getForegroundPermissionsAsync: jest.fn(),
  watchHeadingAsync: jest.fn(),
}));

jest.mock('expo-sensors', () => ({
  Accelerometer: { addListener: jest.fn(), setUpdateInterval: jest.fn() },
  Magnetometer: { addListener: jest.fn(), setUpdateInterval: jest.fn(), isAvailableAsync: jest.fn() },
}));

/** A sensor sample as expo-sensors delivers it (timestamp is unused here). */
type SensorReading = { x: number; y: number; z: number; timestamp: number };

const watchHeadingAsync = jest.mocked(Location.watchHeadingAsync);
const getPermissions = jest.mocked(Location.getForegroundPermissionsAsync);
const accelerometerListen = jest.mocked(Accelerometer.addListener);
const magnetometerListen = jest.mocked(Magnetometer.addListener);
const magnetometerAvailable = jest.mocked(Magnetometer.isAvailableAsync);

// A phone pose for the math tests, in a world frame of east, north, up. The top edge leans
// toward `bearing` (degrees clockwise from north) and is tilted `tilt` degrees from flat:
// 0 is flat with the top at `bearing`; 90 is upright with the back facing `bearing`.
// The magnetic field points north and down (northern hemisphere).
type Axes = { top: Vec3; right: Vec3; out: Vec3 };
const rad = (degrees: number) => (degrees * Math.PI) / 180;
const WORLD_UP: Vec3 = [0, 0, 1];
const WORLD_FIELD: Vec3 = [0, 0.8, -0.6];

function poseAxes(bearing: number, tilt: number): Axes {
  const toward: Vec3 = [Math.sin(rad(bearing)), Math.cos(rad(bearing)), 0];
  const right: Vec3 = [Math.cos(rad(bearing)), -Math.sin(rad(bearing)), 0];
  const c = Math.cos(rad(tilt));
  const s = Math.sin(rad(tilt));
  return {
    top: [toward[0] * c, toward[1] * c, s],
    right,
    out: [-toward[0] * s, -toward[1] * s, c],
  };
}

/** A world vector in the phone's own axes, which is how the sensors report it. */
function inDevice(world: Vec3, axes: Axes): Vec3 {
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return [dot(world, axes.right), dot(world, axes.top), dot(world, axes.out)];
}

function readingsFor(bearing: number, tilt: number) {
  const axes = poseAxes(bearing, tilt);
  return { gravity: inDevice(WORLD_UP, axes), magnetic: inDevice(WORLD_FIELD, axes) };
}

/** The heading the top edge should report for this pose, with no declination. */
function topHeadingFor(bearing: number, tilt: number, up: Vec3 = DEVICE_TOP) {
  const { gravity, magnetic } = readingsFor(bearing, tilt);
  return topEdgeAzimuth(gravity, magnetic, up);
}

/** Circular distance in degrees, so 359 and 1 are 2 apart. */
const circularGap = (a: number, b: number) => Math.abs(normalize180(a - b));

// The throttle reads Date.now(). The clock is driven by the test, so the 100 ms window is exact on every machine.
let clock = 1_000_000;
const tick = (ms: number) => {
  clock += ms;
};

/** Mocks the hook's sensors and location with working defaults; a test overrides only what it needs. */
function installDefaults() {
  jest.resetAllMocks();
  clock = 1_000_000;
  jest.spyOn(Date, 'now').mockImplementation(() => clock);
  getPermissions.mockResolvedValue({ status: Location.PermissionStatus.GRANTED } as never);
  watchHeadingAsync.mockImplementation(() => Promise.resolve({ remove: jest.fn() }));
  accelerometerListen.mockImplementation(() => ({ remove: jest.fn() }));
  magnetometerListen.mockImplementation(() => ({ remove: jest.fn() }));
  magnetometerAvailable.mockResolvedValue(true);
}

/** Waits for the permission check and the watch to settle (the subscription lands a few ticks after the effect). */
async function settle() {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  });
}

describe('useQiblaHeading', () => {
  beforeEach(() => {
    installDefaults();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resetWindowSize();
  });

  it('starts idle: no heading, unavailable accuracy, compass assumed supported, not aligned', async () => {
    const { result } = await renderHook(() => useQiblaHeading(true));

    expect(result.current.hasHeading).toBe(false);
    expect(result.current.accuracy).toBe('unavailable');
    expect(result.current.supported).toBe(true);
    expect(result.current.aligned).toBe(false);
  });

  it('does not subscribe while disabled (static dial for Reduce Motion, missing coords, or an inactive screen)', async () => {
    await renderHook(() => useQiblaHeading(false));
    await settle();

    expect(watchHeadingAsync).not.toHaveBeenCalled();
    expect(accelerometerListen).not.toHaveBeenCalled();
  });

  it('does not watch without a granted location permission, and leaves the compass supported', async () => {
    getPermissions.mockResolvedValue({ status: Location.PermissionStatus.DENIED } as never);

    const { result } = await renderHook(() => useQiblaHeading(true));
    await settle();

    expect(watchHeadingAsync).not.toHaveBeenCalled();
    expect(result.current.supported).toBe(true);
  });

  it('subscribes while enabled and reports throttled true-north headings', async () => {
    let callback: Location.LocationHeadingCallback = () => undefined;
    watchHeadingAsync.mockImplementation((cb) => {
      callback = cb;
      return Promise.resolve({ remove: jest.fn() });
    });

    const { result } = await renderHook(() => useQiblaHeading(true));
    await settle();
    expect(watchHeadingAsync).toHaveBeenCalled();

    await act(async () => callback({ trueHeading: 244, magHeading: 240, accuracy: 10 }));
    expect(result.current.headingValue.value).toBe(244);
    expect(result.current.hasHeading).toBe(true);
    expect(result.current.accuracy).toBe('good');

    // Inside the 100 ms throttle window: dropped.
    tick(50);
    await act(async () => callback({ trueHeading: 100, magHeading: 100, accuracy: 10 }));
    expect(result.current.headingValue.value).toBe(244);

    // Past the window: accepted.
    tick(110);
    await act(async () => callback({ trueHeading: 100, magHeading: 100, accuracy: 10 }));
    expect(result.current.headingValue.value).toBe(100);
  });

  it('marks accuracy poor for negative or high accuracy values', async () => {
    let callback: Location.LocationHeadingCallback = () => undefined;
    watchHeadingAsync.mockImplementation((cb) => {
      callback = cb;
      return Promise.resolve({ remove: jest.fn() });
    });

    const { result } = await renderHook(() => useQiblaHeading(true));
    await settle();

    await act(async () => callback({ trueHeading: 10, magHeading: 10, accuracy: -1 }));
    expect(result.current.accuracy).toBe('poor');

    tick(110);
    await act(async () => callback({ trueHeading: 10, magHeading: 10, accuracy: 21 }));
    expect(result.current.accuracy).toBe('poor');
  });

  it('treats a negative true heading (iOS uncalibrated) as poor and keeps the last heading', async () => {
    let callback: Location.LocationHeadingCallback = () => undefined;
    watchHeadingAsync.mockImplementation((cb) => {
      callback = cb;
      return Promise.resolve({ remove: jest.fn() });
    });

    const { result } = await renderHook(() => useQiblaHeading(true));
    await settle();

    await act(async () => callback({ trueHeading: 42, magHeading: 42, accuracy: 5 }));
    expect(result.current.headingValue.value).toBe(42);

    tick(110);
    await act(async () => callback({ trueHeading: -1, magHeading: 40, accuracy: -1 }));
    expect(result.current.accuracy).toBe('poor');
    expect(result.current.headingValue.value).toBe(42);
  });

  it('treats missing accuracy with a live heading as good (some Android devices)', async () => {
    let callback: Location.LocationHeadingCallback = () => undefined;
    watchHeadingAsync.mockImplementation((cb) => {
      callback = cb;
      return Promise.resolve({ remove: jest.fn() });
    });

    const { result } = await renderHook(() => useQiblaHeading(true));
    await settle();

    await act(async () => callback({ trueHeading: 10, magHeading: 10 } as Location.LocationHeadingObject));
    expect(result.current.headingValue.value).toBe(10);
    expect(result.current.accuracy).toBe('good');
  });

  it('flips supported to false when the device has no compass (watchHeadingAsync throws)', async () => {
    watchHeadingAsync.mockRejectedValueOnce(new Error('no magnetometer'));

    const { result } = await renderHook(() => useQiblaHeading(true));
    await settle();

    expect(result.current.supported).toBe(false);
  });

  it('unsubscribes on unmount', async () => {
    const mockRemove = jest.fn();
    watchHeadingAsync.mockResolvedValueOnce({ remove: mockRemove });

    const { unmount } = await renderHook(() => useQiblaHeading(true));
    await settle();

    await act(async () => unmount());
    expect(mockRemove).toHaveBeenCalled();
  });

  it('a removeWatchAsync rejection on cleanup ("Not authorized") is handled, not left unhandled', async () => {
    // Created on cleanup, not up front, so no rejection is pending before the hook has a chance to handle it.
    watchHeadingAsync.mockResolvedValueOnce({
      remove: () => Promise.reject(new Error('Not authorized to use location services')) as unknown as void,
    });

    const { unmount } = await renderHook(() => useQiblaHeading(true));
    await settle();

    await act(async () => unmount());
    await settle();
  });

  it('re-renders only for changes of accuracy, hasHeading, aligned or supported, never for each heading sample', async () => {
    let callback: Location.LocationHeadingCallback = () => undefined;
    watchHeadingAsync.mockImplementation((cb) => {
      callback = cb;
      return Promise.resolve({ remove: jest.fn() });
    });
    let renders = 0;
    const { result } = await renderHook(() => {
      renders += 1;
      return useQiblaHeading(true, 244);
    });
    await settle();

    await act(async () => callback({ trueHeading: 200, magHeading: 200, accuracy: 5 }));
    const afterFirst = renders;
    // Five more headings, all good accuracy, none aligned with 244: no state changes, so no renders.
    for (const heading of [201, 202, 203, 204, 205]) {
      tick(110);
      await act(async () => callback({ trueHeading: heading, magHeading: heading, accuracy: 5 }));
    }

    expect(renders).toBe(afterFirst);
    expect(result.current.headingValue.value).toBe(205);
  });

  it('reports aligned when the heading is within the enter band of the bearing, and not when poor', async () => {
    let callback: Location.LocationHeadingCallback = () => undefined;
    watchHeadingAsync.mockImplementation((cb) => {
      callback = cb;
      return Promise.resolve({ remove: jest.fn() });
    });
    const { result } = await renderHook(() => useQiblaHeading(true, 244));
    await settle();

    await act(async () => callback({ trueHeading: 242, magHeading: 242, accuracy: 5 }));
    expect(result.current.aligned).toBe(true);

    tick(110);
    await act(async () => callback({ trueHeading: 242, magHeading: 242, accuracy: 25 }));
    expect(result.current.accuracy).toBe('poor');
    expect(result.current.aligned).toBe(false);
  });

  it('keeps aligned through the leave band (3°–6°) and drops it only beyond 6°', async () => {
    let callback: Location.LocationHeadingCallback = () => undefined;
    watchHeadingAsync.mockImplementation((cb) => {
      callback = cb;
      return Promise.resolve({ remove: jest.fn() });
    });
    const { result } = await renderHook(() => useQiblaHeading(true, 244));
    await settle();

    await act(async () => callback({ trueHeading: 244, magHeading: 244, accuracy: 5 }));
    expect(result.current.aligned).toBe(true);

    tick(110);
    await act(async () => callback({ trueHeading: 238, magHeading: 238, accuracy: 5 })); // 6°: still aligned
    expect(result.current.aligned).toBe(true);

    tick(110);
    await act(async () => callback({ trueHeading: 237, magHeading: 237, accuracy: 5 })); // 7°: leaves
    expect(result.current.aligned).toBe(false);
  });

  it('is never aligned without a bearing', async () => {
    let callback: Location.LocationHeadingCallback = () => undefined;
    watchHeadingAsync.mockImplementation((cb) => {
      callback = cb;
      return Promise.resolve({ remove: jest.fn() });
    });
    const { result } = await renderHook(() => useQiblaHeading(true, null));
    await settle();

    await act(async () => callback({ trueHeading: 244, magHeading: 244, accuracy: 5 }));
    expect(result.current.aligned).toBe(false);
  });

  it('on iOS, the accelerometer runs only while landscape', async () => {
    const { rerender } = await renderHook(() => useQiblaHeading(true));
    await settle();
    expect(accelerometerListen).not.toHaveBeenCalled();

    await act(async () => setWindowSize(LANDSCAPE_PHONE.width, LANDSCAPE_PHONE.height));
    await rerender(undefined);
    await settle();
    expect(accelerometerListen).toHaveBeenCalledTimes(1);
  });
});

describe('hysteresis and the needle maths', () => {
  it('enters alignment at 3° and leaves it only beyond 6°', () => {
    expect(ALIGNED_ENTER_DEGREES).toBe(3);
    expect(ALIGNED_LEAVE_DEGREES).toBe(6);
    expect(nextAligned(false, 3)).toBe(true);
    expect(nextAligned(false, 3.5)).toBe(false);
    expect(nextAligned(true, 5)).toBe(true);
    expect(nextAligned(true, -6)).toBe(true);
    expect(nextAligned(true, 6.5)).toBe(false);
  });

  it('normalize180 maps any angle into −180…180', () => {
    expect(normalize180(0)).toBe(0);
    expect(normalize180(370)).toBe(10);
    expect(normalize180(-10)).toBe(-10);
    expect(normalize180(190)).toBe(-170);
    expect(normalize180(-190)).toBe(170);
    expect(normalize180(360)).toBe(0);
  });

  it('shortestTurn never swings through 0° for a 350° change', () => {
    expect(shortestTurn(10, 20)).toBe(10);
    expect(shortestTurn(350, 10)).toBe(20);
    expect(shortestTurn(10, 350)).toBe(-20);
  });

  it('needleAngleFor is bearing − heading, normalized to −180…180', () => {
    expect(needleAngleFor(244, 14)).toBe(-130); // 230°, written the shortest way round
    expect(needleAngleFor(244, 0)).toBe(-116);
    expect(needleAngleFor(10, 350)).toBe(20);
    expect(needleAngleFor(350, 10)).toBe(-20);
    expect(needleAngleFor(244, 244)).toBe(0);
  });

  it('normalize360 maps any angle into 0…360 and keeps 359 and 1 across north', () => {
    expect(normalize360(360)).toBe(0);
    expect(normalize360(-1)).toBe(359);
    expect(normalize360(361)).toBe(1);
    expect(circularGap(359, 1)).toBe(2);
  });

  it('removeQuietly swallows a synchronous throw and a rejected promise', () => {
    expect(() =>
      removeQuietly({
        remove: () => {
          throw new Error('gone');
        },
      }),
    ).not.toThrow();
    expect(() => removeQuietly({ remove: () => Promise.reject(new Error('Not authorized')) })).not.toThrow();
  });
});

describe('topEdgeAzimuth: tilt-compensated top edge', () => {
  it('flat, top edge pointing north reads 0', () => {
    expect(circularGap(topHeadingFor(0, 0)!, 0)).toBeLessThan(0.01);
  });

  it('flat, top edge pointing elsewhere reads that bearing', () => {
    expect(circularGap(topHeadingFor(30, 0)!, 30)).toBeLessThan(0.01);
    expect(circularGap(topHeadingFor(270, 0)!, 270)).toBeLessThan(0.01);
  });

  it('flat, tipped slightly back (top edge down) still reads the top edge bearing', () => {
    expect(circularGap(topHeadingFor(30, -30)!, 30)).toBeLessThan(0.01);
  });

  it('upright, the phone reads the bearing its back faces, not a random or flipped one', () => {
    expect(circularGap(topHeadingFor(30, 90)!, 30)).toBeLessThan(0.01);
    expect(circularGap(topHeadingFor(200, 90)!, 200)).toBeLessThan(0.01);
  });

  it('tilted past vertical (top leaning toward the user) keeps the same reading, no 180° flip', () => {
    // The bare top-edge projection flips to 210° here: that was the "bottom instead of top" bug.
    expect(circularGap(topHeadingFor(30, 100)!, 30)).toBeLessThan(0.01);
    expect(circularGap(topHeadingFor(30, 120)!, 30)).toBeLessThan(0.01);
  });

  it('landscape: the right edge (sign +1) and the left edge (sign −1) read ±90° from the top', () => {
    expect(circularGap(topHeadingFor(0, 0, [1, 0, 0])!, 90)).toBeLessThan(0.01);
    expect(circularGap(topHeadingFor(0, 0, [-1, 0, 0])!, 270)).toBeLessThan(0.01);
    expect(circularGap(topHeadingFor(30, 0, [1, 0, 0])!, 120)).toBeLessThan(0.01);
  });

  it('landscape upright (right edge up, back facing north) reads north', () => {
    // Device axes: right edge up, top edge pointing west, back facing north.
    const gravity: Vec3 = [1, 0, 0];
    const magnetic: Vec3 = [-0.6, 0, -0.8];
    expect(circularGap(topEdgeAzimuth(gravity, magnetic, [1, 0, 0])!, 0)).toBeLessThan(0.01);
  });

  it('wraps across north: a top edge at 359° reads 359, not 179 or 0', () => {
    expect(circularGap(topHeadingFor(359, 0)!, 359)).toBeLessThan(0.01);
    expect(circularGap(topHeadingFor(1, 0)!, 1)).toBeLessThan(0.01);
  });

  it('returns null when the sensors are degenerate', () => {
    expect(topEdgeAzimuth([0, 0, 0], [0, 0.8, -0.6])).toBeNull();
    // Magnetic field parallel to gravity: no east direction.
    expect(topEdgeAzimuth([0, 0, 1], [0, 0, 0.5])).toBeNull();
  });

  it('screenUpAxis and screenTurnDegrees describe portrait, landscape-right and landscape-left', () => {
    expect(screenUpAxis(false, 1)).toEqual(DEVICE_TOP);
    expect(screenUpAxis(true, 1)).toEqual([1, 0, 0]);
    expect(screenUpAxis(true, -1)).toEqual([-1, 0, 0]);
    expect(screenTurnDegrees(false, 1)).toBe(0);
    expect(screenTurnDegrees(true, 1)).toBe(90);
    expect(screenTurnDegrees(true, -1)).toBe(-90);
  });
});

describe('useQiblaHeading on Android (sensor-derived top edge)', () => {
  let accelerometerEvent: (m: SensorReading) => void;
  let magnetometerEvent: (m: SensorReading) => void;
  let headingEvent: (event: Location.LocationHeadingObject) => void;
  let platform: { restore: () => void };

  beforeEach(() => {
    installDefaults();
    platform = jest.replaceProperty(Platform, 'OS', 'android');
    watchHeadingAsync.mockImplementation((cb) => {
      headingEvent = cb;
      return Promise.resolve({ remove: jest.fn() });
    });
    accelerometerListen.mockImplementation((cb) => {
      accelerometerEvent = cb as never;
      return { remove: jest.fn() };
    });
    magnetometerListen.mockImplementation((cb) => {
      magnetometerEvent = cb as never;
      return { remove: jest.fn() };
    });
  });

  afterEach(() => {
    platform.restore();
  });

  /** Feeds one pose the way the device does: declination from expo-location, then the sensors. */
  async function feed(bearing: number, tilt: number, trueHeading: number, magHeading: number) {
    const hook = await renderHook(() => useQiblaHeading(true));
    await settle();
    const { gravity, magnetic } = readingsFor(bearing, tilt);
    await act(async () => {
      headingEvent({ trueHeading, magHeading, accuracy: 3 });
      accelerometerEvent({ x: gravity[0], y: gravity[1], z: gravity[2], timestamp: 0 });
      magnetometerEvent({ x: magnetic[0], y: magnetic[1], z: magnetic[2], timestamp: 0 });
    });
    return hook.result;
  }

  it('reports the tilt-compensated top edge plus declination (trueHeading − magHeading)', async () => {
    // Declination 5°: true = magnetic + 5.
    const result = await feed(30, 100, 25, 20);

    expect(result.current.hasHeading).toBe(true);
    expect(circularGap(result.current.headingValue.value, 35)).toBeLessThan(0.01);
    expect(result.current.accuracy).toBe('good');
    expect(result.current.supported).toBe(true);
  });

  it('wraps declination across north (358 magnetic + 3° declination reads 1)', async () => {
    const result = await feed(358, 0, 1, 358);

    expect(result.current.hasHeading).toBe(true);
    expect(circularGap(result.current.headingValue.value, 1)).toBeLessThan(0.01);
  });

  it('reads poor with no heading until expo-location supplies declination (no location yet)', async () => {
    const hook = await renderHook(() => useQiblaHeading(true));
    await settle();
    const { gravity, magnetic } = readingsFor(30, 0);
    await act(async () => {
      headingEvent({ trueHeading: -1, magHeading: 20, accuracy: -1 });
      accelerometerEvent({ x: gravity[0], y: gravity[1], z: gravity[2], timestamp: 0 });
      magnetometerEvent({ x: magnetic[0], y: magnetic[1], z: magnetic[2], timestamp: 0 });
    });

    expect(hook.result.current.accuracy).toBe('poor');
    expect(hook.result.current.hasHeading).toBe(false);
  });

  it('keeps the accelerometer running on Android in portrait (the tilt-compensated heading needs it)', async () => {
    await renderHook(() => useQiblaHeading(true));
    await settle();

    expect(accelerometerListen).toHaveBeenCalledTimes(1);
  });

  it('flips supported to false when the device has no magnetometer, and stops the accelerometer it started', async () => {
    magnetometerAvailable.mockResolvedValueOnce(false);
    const removeAccelerometer = jest.fn();
    accelerometerListen.mockImplementationOnce(() => ({ remove: removeAccelerometer }) as never);

    const hook = await renderHook(() => useQiblaHeading(true));
    await settle();

    expect(hook.result.current.supported).toBe(false);
    expect(removeAccelerometer).toHaveBeenCalled();
  });
});
