import { renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { needleAngleFor, normalize180, shortestTurn, useQiblaHeading } from './useQiblaHeading';

jest.mock('expo-location', () => ({
  watchHeadingAsync: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
}));

const watchHeadingAsync = jest.mocked(Location.watchHeadingAsync);

/** Flush the pending watchHeadingAsync promise so the subscription lands. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('useQiblaHeading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts idle: no heading, unavailable accuracy, compass assumed supported', async () => {
    const { result } = await renderHook(() => useQiblaHeading(true));

    expect(result.current).toEqual({ heading: null, accuracy: 'unavailable', supported: true });
  });

  it('does not subscribe while disabled (static dial for Reduce Motion or missing coords)', async () => {
    await renderHook(() => useQiblaHeading(false));
    await flush();

    expect(watchHeadingAsync).not.toHaveBeenCalled();
  });

  it('subscribes while enabled and reports throttled true-north headings', async () => {
    const mockRemove = jest.fn();
    let callback: Location.LocationHeadingCallback = () => undefined;
    watchHeadingAsync.mockImplementation((cb) => {
      callback = cb;
      return Promise.resolve({ remove: mockRemove });
    });

    const { result } = await renderHook(() => useQiblaHeading(true));
    await waitFor(() => expect(watchHeadingAsync).toHaveBeenCalled());

    callback({ trueHeading: 244, magHeading: 240, accuracy: 10 });
    await waitFor(() => expect(result.current.heading).toBe(244));
    expect(result.current.accuracy).toBe('good');

    // Inside the 100 ms throttle window: dropped.
    callback({ trueHeading: 100, magHeading: 100, accuracy: 10 });
    await flush();
    expect(result.current.heading).toBe(244);

    await new Promise((resolve) => setTimeout(resolve, 110));
    callback({ trueHeading: 100, magHeading: 100, accuracy: 10 });
    await waitFor(() => expect(result.current.heading).toBe(100));
  });

  it('marks accuracy poor for negative or high accuracy values', async () => {
    let callback: Location.LocationHeadingCallback = () => undefined;
    watchHeadingAsync.mockImplementation((cb) => {
      callback = cb;
      return Promise.resolve({ remove: jest.fn() });
    });

    const { result } = await renderHook(() => useQiblaHeading(true));
    await waitFor(() => expect(watchHeadingAsync).toHaveBeenCalled());

    callback({ trueHeading: 10, magHeading: 10, accuracy: -1 });
    await waitFor(() => expect(result.current.accuracy).toBe('poor'));

    await new Promise((resolve) => setTimeout(resolve, 110));
    callback({ trueHeading: 10, magHeading: 10, accuracy: 21 });
    await waitFor(() => expect(result.current.accuracy).toBe('poor'));
  });

  it('treats a negative true heading (iOS uncalibrated) as poor and keeps the last heading', async () => {
    let callback: Location.LocationHeadingCallback = () => undefined;
    watchHeadingAsync.mockImplementation((cb) => {
      callback = cb;
      return Promise.resolve({ remove: jest.fn() });
    });

    const { result } = await renderHook(() => useQiblaHeading(true));
    await waitFor(() => expect(watchHeadingAsync).toHaveBeenCalled());

    callback({ trueHeading: 42, magHeading: 42, accuracy: 5 });
    await waitFor(() => expect(result.current.heading).toBe(42));

    await new Promise((resolve) => setTimeout(resolve, 110));
    callback({ trueHeading: -1, magHeading: 40, accuracy: -1 });
    await waitFor(() => expect(result.current.accuracy).toBe('poor'));
    expect(result.current.heading).toBe(42);
  });

  it('treats missing accuracy with a live heading as good (some Android devices)', async () => {
    let callback: Location.LocationHeadingCallback = () => undefined;
    watchHeadingAsync.mockImplementation((cb) => {
      callback = cb;
      return Promise.resolve({ remove: jest.fn() });
    });

    const { result } = await renderHook(() => useQiblaHeading(true));
    await waitFor(() => expect(watchHeadingAsync).toHaveBeenCalled());

    callback({ trueHeading: 10, magHeading: 10 } as Location.LocationHeadingObject);
    await waitFor(() => {
      expect(result.current.heading).toBe(10);
      expect(result.current.accuracy).toBe('good');
    });
  });

  it('flips supported to false when the device has no compass (watchHeadingAsync throws)', async () => {
    watchHeadingAsync.mockRejectedValueOnce(new Error('no magnetometer'));

    const { result } = await renderHook(() => useQiblaHeading(true));
    await waitFor(() => expect(result.current.supported).toBe(false));
  });

  it('unsubscribes on unmount', async () => {
    const mockRemove = jest.fn();
    watchHeadingAsync.mockResolvedValueOnce({ remove: mockRemove });

    const { unmount } = await renderHook(() => useQiblaHeading(true));
    await waitFor(() => expect(watchHeadingAsync).toHaveBeenCalled());

    unmount();
    // The subscription may resolve after unmount; the hook removes it either way.
    await waitFor(() => expect(mockRemove).toHaveBeenCalled());
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
});
