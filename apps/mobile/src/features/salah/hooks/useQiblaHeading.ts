import { useEffect, useRef, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import * as Location from 'expo-location';
import { Accelerometer, Magnetometer } from 'expo-sensors';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

export type CompassAccuracy = 'good' | 'poor' | 'unavailable';

/** A vector in device coordinates: x to the right edge, y to the top edge, z out of the screen. */
export type Vec3 = readonly [number, number, number];

/** The device's top edge in portrait: the axis that points up on screen when the phone is upright. */
export const DEVICE_TOP: Vec3 = [0, 1, 0];

/** The needle counts as aligned when it is within this many degrees of the marker (entering)... */
export const ALIGNED_ENTER_DEGREES = 3;
/** ...and stays aligned until it is more than this many degrees away (leaving). The gap stops chatter at the edge. */
export const ALIGNED_LEAVE_DEGREES = 6;

/** Normalize an angle into −180…180 so the needle always takes the shortest turn. */
export function normalize180(angle: number): number {
  'worklet';
  return ((((angle + 180) % 360) + 360) % 360) - 180;
}

/** Normalize an angle into 0…360 (359 and 1 stay one degree apart across north). */
export function normalize360(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/** The signed shortest turn between two headings, in −180…180. */
export function shortestTurn(from: number, to: number): number {
  'worklet';
  return normalize180(to - from);
}

/**
 * The needle's target on the fixed north-referenced dial: `bearing − heading`,
 * normalized so it always takes the shortest turn (no 350° swings through 0°).
 */
export function needleAngleFor(bearing: number, heading: number): number {
  'worklet';
  return normalize180(bearing - heading);
}

/**
 * Whether the needle counts as aligned with the marker, given its signed gap in degrees. Entering uses
 * `ALIGNED_ENTER_DEGREES`; once aligned, the wider `ALIGNED_LEAVE_DEGREES` keeps it aligned.
 */
export function nextAligned(wasAligned: boolean, gapDegrees: number): boolean {
  const limit = wasAligned ? ALIGNED_LEAVE_DEGREES : ALIGNED_ENTER_DEGREES;
  return Math.abs(gapDegrees) <= limit;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function unit(v: Vec3): Vec3 | null {
  const length = Math.hypot(v[0], v[1], v[2]);
  return length < 1e-9 ? null : [v[0] / length, v[1] / length, v[2] / length];
}

/**
 * The magnetic azimuth (0…360, clockwise from magnetic north) of the screen's top edge,
 * tilt-compensated.
 *
 * `gravity` is the accelerometer reading (it points up when the phone is still) and
 * `magnetic` the magnetometer reading, both in device coordinates. `screenUp` is the device
 * axis that is up on screen: `DEVICE_TOP` in portrait, the right or left edge in landscape.
 *
 * The reading is the horizontal part of `screenUp − z`, where `z` is the screen normal. Flat,
 * that is the top edge itself. Upright, the top edge is vertical and has no bearing, so the
 * reading becomes the way the back of the phone faces instead. The reading stays put as the
 * phone is tilted through vertical; the bare top-edge projection flips 180° there, which is the
 * "bottom instead of top" report.
 *
 * Returns null when the sensors are degenerate (no gravity or no field, or the edge is vertical).
 */
export function topEdgeAzimuth(gravity: Vec3, magnetic: Vec3, screenUp: Vec3 = DEVICE_TOP): number | null {
  const up = unit(gravity);
  const east = up ? unit(cross(magnetic, up)) : null;
  if (!up || !east) {
    return null;
  }
  const north = cross(up, east);
  const edge: Vec3 = [screenUp[0], screenUp[1], screenUp[2] - 1];
  const eastward = dot(edge, east);
  const northward = dot(edge, north);
  if (Math.hypot(eastward, northward) < 1e-6) {
    return null;
  }
  return normalize360((Math.atan2(eastward, northward) * 180) / Math.PI);
}

/**
 * The device axis that is up on screen. Portrait: the top edge. Landscape: the right edge
 * (`sign` +1, the phone turned so its top faces left) or the left edge (`sign` −1).
 */
export function screenUpAxis(landscape: boolean, sign: 1 | -1): Vec3 {
  return landscape ? [sign, 0, 0] : DEVICE_TOP;
}

/**
 * Degrees from the device top to the screen's top edge, clockwise. iOS reports its heading
 * for the device top, so the landscape turn is added to it: +90 for the right edge, −90 for the left.
 */
export function screenTurnDegrees(landscape: boolean, sign: 1 | -1): number {
  return landscape ? 90 * sign : 0;
}

// ~10 Hz, per the step brief; faster updates only make the spring churn.
const THROTTLE_MS = 100;
// Gravity along the short axis (in g) that decides which landscape side is up. Below this the
// last side seen is kept, so a phone lying flat does not flip the needle by 180°.
const SIDE_THRESHOLD_G = 0.3;

type Subscription = { remove: () => unknown };

type Sample = {
  gravity: Vec3 | null;
  magnetic: Vec3 | null;
  /** Android: trueHeading − magHeading from expo-location, i.e. magnetic declination. */
  declination: number | null;
  accuracy: number | null | undefined;
};

/**
 * Removes a sensor or location subscription without letting a failure escape. On some devices
 * `removeWatchAsync` rejects once location permission is revoked ("Not authorized to use location
 * services"); the promise must not go unhandled, and there is nothing left to clean up.
 */
export function removeQuietly(subscription: Subscription): void {
  try {
    const result = subscription.remove();
    if (result instanceof Promise) {
      result.catch(() => undefined);
    }
  } catch {
    // Already removed, or the native side refused: either way nothing is left to clean up.
  }
}

/**
 * Watches the device compass while `enabled` (the screen decides: a bearing is known, motion is allowed, the screen is
 * focused and the app is active). The heading of the screen's top edge, in true north degrees, goes into a Reanimated
 * SharedValue about ten times a second, so only the needle redraws. React state changes only for `accuracy`,
 * `hasHeading`, `aligned` and `supported`, and only when one of them actually changes.
 *
 * `bearing` is the qibla bearing the needle is measured against, for `aligned`. It is read through a ref, so a new
 * bearing does not restart the sensors.
 *
 * Android: expo-location's heading is the raw azimuth of the device's Y axis, which is undefined
 * when the phone is upright and flips at vertical, and it ignores the screen rotation. So the
 * heading is recomputed here from the accelerometer and magnetometer (`topEdgeAzimuth`), and
 * expo-location only supplies the declination. The accelerometer runs on Android whenever the hook is enabled.
 *
 * iOS: CoreLocation's `trueHeading` already refers to the device top; the landscape turn is added.
 * The accelerometer only tells which landscape side is up, so on iOS it runs only while landscape.
 *
 * No permission prompt here: the screen owns location permission. Without a granted permission nothing is watched.
 * Devices without a magnetometer (and some Android emulators) throw from watchHeadingAsync, which flips `supported`
 * to false so the screen can fall back to the static dial with the unsupported note (D6).
 */
export function useQiblaHeading(enabled: boolean, bearing: number | null = null) {
  const headingValue: SharedValue<number> = useSharedValue(0);
  const [accuracy, setAccuracy] = useState<CompassAccuracy>('unavailable');
  const [supported, setSupported] = useState(true);
  const [hasHeading, setHasHeading] = useState(false);
  const [aligned, setAligned] = useState(false);

  // Values as last committed to React state, so a sample that changes nothing sets nothing.
  const accuracyRef = useRef<CompassAccuracy>('unavailable');
  const hasHeadingRef = useRef(false);
  const alignedRef = useRef(false);
  const lastUpdate = useRef(0);
  const sample = useRef<Sample>({ gravity: null, magnetic: null, declination: null, accuracy: undefined });
  const bearingRef = useRef(bearing);

  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const landscapeRef = useRef(landscape);
  const landscapeSign = useRef<1 | -1>(1);
  useEffect(() => {
    landscapeRef.current = landscape;
  }, [landscape]);
  useEffect(() => {
    bearingRef.current = bearing;
  }, [bearing]);

  const commitAccuracy = (next: CompassAccuracy) => {
    if (accuracyRef.current !== next) {
      accuracyRef.current = next;
      setAccuracy(next);
    }
  };
  const commitAligned = (next: boolean) => {
    if (alignedRef.current !== next) {
      alignedRef.current = next;
      setAligned(next);
    }
  };

  const publish = (next: number | null, reading: number | null | undefined) => {
    const now = Date.now();
    if (now - lastUpdate.current < THROTTLE_MS) {
      return;
    }
    lastUpdate.current = now;

    if (next === null) {
      // iOS reports −1 while the compass is uncalibrated or unavailable.
      commitAccuracy('poor');
      commitAligned(false);
      return;
    }
    headingValue.value = next;
    if (!hasHeadingRef.current) {
      hasHeadingRef.current = true;
      setHasHeading(true);
    }
    // Some Android devices omit accuracy; a live heading then reads as good.
    const nextAccuracy: CompassAccuracy =
      reading === undefined || reading === null ? 'good' : reading < 0 || reading > 20 ? 'poor' : 'good';
    commitAccuracy(nextAccuracy);
    const target = bearingRef.current;
    commitAligned(
      target !== null && nextAccuracy === 'good' && nextAligned(alignedRef.current, normalize180(target - next)),
    );
  };

  // The Android heading needs the declination from expo-location as well, so it is published only once the sensors and
  // the declination have all arrived.
  const computeAndroid = () => {
    const { gravity, magnetic, declination } = sample.current;
    if (!gravity || !magnetic) {
      return;
    }
    const up = landscapeRef.current ? screenUpAxis(true, landscapeSign.current) : DEVICE_TOP;
    const azimuth = topEdgeAzimuth(gravity, magnetic, up);
    publish(azimuth === null || declination === null ? null : normalize360(azimuth + declination), sample.current.accuracy);
  };

  // The heading watch (and, on Android, the magnetometer), while enabled and location permission is granted.
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const android = Platform.OS === 'android';
    const subscriptions: Subscription[] = [];
    let cancelled = false;

    const onMagnetometer = ({ x, y, z }: { x: number; y: number; z: number }) => {
      sample.current.magnetic = [x, y, z];
      computeAndroid();
    };

    const onHeading = (event: Location.LocationHeadingObject) => {
      if (android) {
        sample.current.declination = event.trueHeading < 0 ? null : normalize360(event.trueHeading - event.magHeading);
        sample.current.accuracy = event.accuracy;
        return;
      }
      if (event.trueHeading < 0) {
        publish(null, event.accuracy);
        return;
      }
      publish(
        normalize360(event.trueHeading + screenTurnDegrees(landscapeRef.current, landscapeSign.current)),
        event.accuracy,
      );
    };

    const track = (subscription: Subscription) => {
      if (cancelled) {
        removeQuietly(subscription);
      } else {
        subscriptions.push(subscription);
      }
    };

    const start = async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (cancelled || permission?.status !== Location.PermissionStatus.GRANTED) {
          return;
        }
        track(await Location.watchHeadingAsync(onHeading));
        if (android) {
          if (!(await Magnetometer.isAvailableAsync())) {
            if (!cancelled) {
              setSupported(false);
            }
            return;
          }
          Magnetometer.setUpdateInterval(THROTTLE_MS);
          track(Magnetometer.addListener(onMagnetometer));
        }
      } catch {
        if (!cancelled) {
          setSupported(false);
        }
      }
    };
    void start();

    return () => {
      cancelled = true;
      subscriptions.forEach(removeQuietly);
      subscriptions.length = 0;
      // Nothing is measured while disabled, so the needle is not aligned until a new sample says so.
      commitAligned(false);
    };
    // publish and computeAndroid read only refs, the sample and the SharedValue, which are stable. Listing them would
    // restart the sensor subscriptions on every render, so they are left out on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // The accelerometer: on Android it is needed for the tilt-compensated heading; on iOS only while landscape, when it
  // tells which side is up. It is added and removed with those conditions, not on every heading sample.
  const needsAccelerometer = enabled && supported && (Platform.OS === 'android' || landscape);
  useEffect(() => {
    if (!needsAccelerometer) {
      return undefined;
    }
    const android = Platform.OS === 'android';
    const onAccelerometer = ({ x, y, z }: { x: number; y: number; z: number }) => {
      // Android reports the reaction to gravity (+1 g up when flat). iOS reports the
      // opposite sign, so it is flipped to the same convention.
      const gravity: Vec3 = android ? [x, y, z] : [-x, -y, -z];
      sample.current.gravity = gravity;
      if (landscapeRef.current && Math.abs(gravity[0]) > SIDE_THRESHOLD_G) {
        landscapeSign.current = gravity[0] > 0 ? 1 : -1;
      }
      if (android) {
        computeAndroid();
      }
    };
    Accelerometer.setUpdateInterval(THROTTLE_MS);
    const subscription = Accelerometer.addListener(onAccelerometer);
    return () => removeQuietly(subscription);
    // computeAndroid reads only refs, the sample ref and the SharedValue, so the listener needs no other dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsAccelerometer]);

  return { headingValue, hasHeading, accuracy, supported, aligned };
}
