import { act, renderHook } from '@testing-library/react-native';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useScreenActive } from './useScreenActive';

// The focus effect runs as a plain effect, so the screen counts as focused for the whole test. The effect is handed
// to React through the test file's own import, the same React instance the hook renders with.
const mockFocusEffect = jest.fn();
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => mockFocusEffect(effect),
}));

beforeEach(() => {
  mockFocusEffect.mockImplementation((effect: () => void | (() => void)) => {
    useEffect(effect, [effect]);
  });
});

/** Sets the app state the hook reads on mount (RN exposes it as a read-only property). */
function setAppState(state: AppStateStatus) {
  Object.defineProperty(AppState, 'currentState', { configurable: true, get: () => state });
}

describe('useScreenActive', () => {
  let appStateChange: ((state: AppStateStatus) => void) | undefined;
  let remove: jest.Mock;

  beforeEach(() => {
    appStateChange = undefined;
    remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      appStateChange = handler;
      return { remove } as never;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is true while the screen is focused and the app is in the foreground', async () => {
    setAppState('active');

    const { result } = await renderHook(() => useScreenActive());

    expect(result.current).toBe(true);
  });

  it('turns false when the app goes to the background, and true again when it returns', async () => {
    setAppState('active');
    const { result } = await renderHook(() => useScreenActive());

    await act(async () => appStateChange?.('background'));
    expect(result.current).toBe(false);

    await act(async () => appStateChange?.('active'));
    expect(result.current).toBe(true);
  });

  it('is false when the app starts in the background', async () => {
    setAppState('background');

    const { result } = await renderHook(() => useScreenActive());

    expect(result.current).toBe(false);
  });

  it('removes its AppState listener on unmount', async () => {
    setAppState('active');

    const { unmount } = await renderHook(() => useScreenActive());
    await act(async () => unmount());

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
