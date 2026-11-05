import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { getBootstrap } from '@/core/api';
import type { BootstrapResponse } from '@quran/api-contract';

import { useForceUpdate } from './use-force-update';

const mockApplication = { nativeApplicationVersion: '1.0.1' as string | null };
// The route segments the hook reads. Tabs are under the (main) group; a sheet is a root route above it.
const mockSegments = { value: ['(main)', '(home)'] as string[] };
const TABS = ['(main)', '(home)'];
const SHEET = ['reader-settings'];

jest.mock('expo-application', () => ({
  get nativeApplicationVersion() {
    return mockApplication.nativeApplicationVersion;
  },
}));

jest.mock('expo-router', () => ({
  useSegments: () => mockSegments.value,
}));

jest.mock('@/core/api', () => ({
  getBootstrap: jest.fn(),
}));

const mockGetBootstrap = getBootstrap as jest.MockedFunction<typeof getBootstrap>;

const IOS_STORE = 'https://apps.apple.com/app/id6828097265';
const ANDROID_STORE = 'https://play.google.com/store/apps/details?id=com.taybahapp.taybah';

function bootstrap(minimum: { ios: string | null; android: string | null }): BootstrapResponse {
  return {
    min_app_version: minimum,
    store_url: { ios: IOS_STORE, android: ANDROID_STORE },
  };
}

// Lets the launch check finish: it awaits the API call, then sets state.
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('useForceUpdate', () => {
  beforeEach(() => {
    mockApplication.nativeApplicationVersion = '1.0.1';
    mockSegments.value = TABS;
    jest.replaceProperty(Platform, 'OS', 'ios');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockGetBootstrap.mockReset();
  });

  it('returns the iOS store link when the install is below the minimum', async () => {
    mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: null }));

    const { result } = await renderHook(() => useForceUpdate());

    await waitFor(() => expect(result.current).toBe(IOS_STORE));
  });

  it('returns null when the install is up to date', async () => {
    mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.1', android: null }));

    const { result } = await renderHook(() => useForceUpdate());
    await settle();

    expect(mockGetBootstrap).toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  it('returns null and does not throw when the API cannot be reached', async () => {
    mockGetBootstrap.mockRejectedValue(new Error('offline'));

    const { result } = await renderHook(() => useForceUpdate());
    await settle();

    expect(result.current).toBeNull();
  });

  it('clears the link on a foreground check once the minimum has been lowered', async () => {
    let onChange: ((state: AppStateStatus) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      onChange = handler;
      return { remove: jest.fn() };
    });
    mockGetBootstrap.mockResolvedValueOnce(bootstrap({ ios: '1.0.2', android: null }));
    mockGetBootstrap.mockResolvedValueOnce(bootstrap({ ios: '1.0.0', android: null }));

    const { result } = await renderHook(() => useForceUpdate());
    await waitFor(() => expect(result.current).toBe(IOS_STORE));

    await act(async () => {
      onChange?.('active');
    });

    expect(mockGetBootstrap).toHaveBeenCalledTimes(2);
    expect(result.current).toBeNull();
  });

  it('stays null on iOS on a screen above the tabs', async () => {
    mockSegments.value = SHEET;
    mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: null }));

    const { result } = await renderHook(() => useForceUpdate());
    await settle();

    expect(result.current).toBeNull();
  });

  it('returns the Android store link even on a screen above the tabs', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mockSegments.value = SHEET;
    mockGetBootstrap.mockResolvedValue(bootstrap({ ios: null, android: '1.0.2' }));

    const { result } = await renderHook(() => useForceUpdate());

    await waitFor(() => expect(result.current).toBe(ANDROID_STORE));
  });

  it('removes its foreground listener on unmount', async () => {
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove } as unknown as ReturnType<typeof AppState.addEventListener>);
    mockGetBootstrap.mockResolvedValue(bootstrap({ ios: null, android: null }));

    const { unmount } = await renderHook(() => useForceUpdate());
    await act(async () => {
      unmount();
    });

    expect(remove).toHaveBeenCalledTimes(1);
  });

  describe('on iOS', () => {
    it('compares only the iOS minimum and ignores the Android one', async () => {
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: null, android: '9.0.0' }));

      const { result } = await renderHook(() => useForceUpdate());
      await settle();

      expect(result.current).toBeNull();
    });

    it('returns the iOS store link on the tabs when the iOS minimum is above the install and the Android minimum is not', async () => {
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: '1.0.0' }));

      const { result } = await renderHook(() => useForceUpdate());

      await waitFor(() => expect(result.current).toBe(IOS_STORE));
    });

    it('stays null at launch on a screen above the tabs, then shows the link on the next foreground check once back on the tabs', async () => {
      let onChange: ((state: AppStateStatus) => void) | undefined;
      jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
        onChange = handler;
        return { remove: jest.fn() };
      });
      mockSegments.value = SHEET;
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: null }));

      const { result, rerender } = await renderHook(() => useForceUpdate());
      await settle();

      expect(result.current).toBeNull();

      mockSegments.value = TABS;
      await act(async () => {
        rerender();
      });
      await act(async () => {
        onChange?.('active');
      });

      await waitFor(() => expect(result.current).toBe(IOS_STORE));
      expect(mockGetBootstrap).toHaveBeenCalledTimes(2);
    });

    it('keeps the iOS store link when a foreground check fails while offline', async () => {
      const fire = listenForAppState();
      mockGetBootstrap.mockResolvedValueOnce(bootstrap({ ios: '1.0.2', android: null }));
      mockGetBootstrap.mockRejectedValueOnce(new Error('offline'));

      const { result } = await renderHook(() => useForceUpdate());
      await waitFor(() => expect(result.current).toBe(IOS_STORE));

      await fire('active');

      expect(mockGetBootstrap).toHaveBeenCalledTimes(2);
      expect(result.current).toBe(IOS_STORE);
    });

    it('returns null without a check when the installed version is unknown', async () => {
      mockApplication.nativeApplicationVersion = null;
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: null }));

      const { result } = await renderHook(() => useForceUpdate());
      await settle();

      expect(mockGetBootstrap).toHaveBeenCalledTimes(1);
      expect(result.current).toBeNull();
    });

    it.each(['background', 'inactive'] as const)('does not call the API on a foreground event with state "%s"', async (state) => {
      const fire = listenForAppState();
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: null }));

      const { result } = await renderHook(() => useForceUpdate());
      await waitFor(() => expect(result.current).toBe(IOS_STORE));
      expect(mockGetBootstrap).toHaveBeenCalledTimes(1);

      await fire(state);

      expect(mockGetBootstrap).toHaveBeenCalledTimes(1);
      expect(result.current).toBe(IOS_STORE);
    });

    it('decides from the installed native version: the same minimum requires an update on 1.0.1 and not on 1.0.2', async () => {
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: null }));

      mockApplication.nativeApplicationVersion = '1.0.1';
      const older = await renderHook(() => useForceUpdate());
      await waitFor(() => expect(older.result.current).toBe(IOS_STORE));
      await act(async () => {
        older.unmount();
      });

      mockApplication.nativeApplicationVersion = '1.0.2';
      const current = await renderHook(() => useForceUpdate());
      await settle();
      expect(current.result.current).toBeNull();
    });
  });

  describe('on Android', () => {
    it('compares only the Android minimum and ignores the iOS one', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '9.0.0', android: null }));

      const { result } = await renderHook(() => useForceUpdate());
      await settle();

      expect(result.current).toBeNull();
    });
  });
});

// Captures the foreground listener the hook registers and returns a function that fires it and lets the check finish.
function listenForAppState(): (state: AppStateStatus) => Promise<void> {
  let onChange: ((state: AppStateStatus) => void) | undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    onChange = handler;
    return { remove: jest.fn() };
  });
  return async (state) => {
    await act(async () => {
      onChange?.(state);
    });
    await settle();
  };
}
