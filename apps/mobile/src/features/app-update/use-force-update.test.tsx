import { act, renderHook, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { getBootstrap } from '@/core/api';
import type { BootstrapResponse } from '@quran/api-contract';

import { useForceUpdate } from './use-force-update';

const mockApplication = { nativeApplicationVersion: '1.0.1' as string | null };
// The route segments the hook reads. Tabs are under the (main) group; a sheet is a root route above it.
const mockSegments = { value: ['(main)', '(home)'] as string[] };
const mockUpdates = { isEnabled: true, isUpdatePending: false };
const TABS = ['(main)', '(home)'];
const SHEET = ['reader-settings'];
const ONBOARDING = ['(onboarding)', 'language'];

jest.mock('expo-application', () => ({
  get nativeApplicationVersion() {
    return mockApplication.nativeApplicationVersion;
  },
}));

jest.mock('expo-router', () => ({
  useSegments: () => mockSegments.value,
  router: { canDismiss: jest.fn(() => true), dismissAll: jest.fn() },
}));

jest.mock('expo-updates', () => ({
  get isEnabled() {
    return mockUpdates.isEnabled;
  },
  useUpdates: () => ({ isUpdatePending: mockUpdates.isUpdatePending }),
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

jest.mock('@/core/api', () => ({
  getBootstrap: jest.fn(),
}));

const mockGetBootstrap = getBootstrap as jest.MockedFunction<typeof getBootstrap>;
const mockCheckForUpdate = Updates.checkForUpdateAsync as jest.MockedFunction<typeof Updates.checkForUpdateAsync>;
const mockFetchUpdate = Updates.fetchUpdateAsync as jest.MockedFunction<typeof Updates.fetchUpdateAsync>;
const mockCanDismiss = router.canDismiss as jest.MockedFunction<typeof router.canDismiss>;
const mockDismissAll = router.dismissAll as jest.MockedFunction<typeof router.dismissAll>;

const IOS_STORE = 'https://apps.apple.com/app/id6828097265';
const ANDROID_STORE = 'https://play.google.com/store/apps/details?id=com.taybahapp.taybah';
const IOS_UPDATE = { kind: 'store', storeUrl: IOS_STORE } as const;
const ANDROID_UPDATE = { kind: 'store', storeUrl: ANDROID_STORE } as const;
const OTA_UPDATE = { kind: 'ota' } as const;

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
    mockUpdates.isEnabled = true;
    mockUpdates.isUpdatePending = false;
    mockCheckForUpdate.mockReset().mockResolvedValue({ isAvailable: false } as Awaited<ReturnType<typeof Updates.checkForUpdateAsync>>);
    mockFetchUpdate.mockReset().mockResolvedValue({ isNew: false } as Awaited<ReturnType<typeof Updates.fetchUpdateAsync>>);
    mockCanDismiss.mockReturnValue(true);
    mockDismissAll.mockReset();
    jest.replaceProperty(Platform, 'OS', 'ios');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockGetBootstrap.mockReset();
  });

  describe('store update', () => {
    it('returns the iOS store link when the install is below the minimum', async () => {
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: null }));

      const { result } = await renderHook(() => useForceUpdate());

      await waitFor(() => expect(result.current).toEqual(IOS_UPDATE));
    });

    it('returns the Android store link when the install is below the Android minimum', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: null, android: '1.0.2' }));

      const { result } = await renderHook(() => useForceUpdate());

      await waitFor(() => expect(result.current).toEqual(ANDROID_UPDATE));
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

    it('returns null without a check when the installed version is unknown', async () => {
      mockApplication.nativeApplicationVersion = null;
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: null }));

      const { result } = await renderHook(() => useForceUpdate());
      await settle();

      expect(result.current).toBeNull();
    });

    it('clears the link on a foreground check once the minimum has been lowered', async () => {
      const fire = listenForAppState();
      mockGetBootstrap.mockResolvedValueOnce(bootstrap({ ios: '1.0.2', android: null }));
      mockGetBootstrap.mockResolvedValueOnce(bootstrap({ ios: '1.0.0', android: null }));

      const { result } = await renderHook(() => useForceUpdate());
      await waitFor(() => expect(result.current).toEqual(IOS_UPDATE));

      await fire('active');

      expect(mockGetBootstrap).toHaveBeenCalledTimes(2);
      expect(result.current).toBeNull();
    });

    it('keeps the iOS store link when a foreground check fails while offline', async () => {
      const fire = listenForAppState();
      mockGetBootstrap.mockResolvedValueOnce(bootstrap({ ios: '1.0.2', android: null }));
      mockGetBootstrap.mockRejectedValueOnce(new Error('offline'));

      const { result } = await renderHook(() => useForceUpdate());
      await waitFor(() => expect(result.current).toEqual(IOS_UPDATE));

      await fire('active');

      expect(mockGetBootstrap).toHaveBeenCalledTimes(2);
      expect(result.current).toEqual(IOS_UPDATE);
    });

    it('does not call the API on a background or inactive app state change', async () => {
      const fire = listenForAppState();
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: null }));

      const { result } = await renderHook(() => useForceUpdate());
      await waitFor(() => expect(result.current).toEqual(IOS_UPDATE));
      expect(mockGetBootstrap).toHaveBeenCalledTimes(1);

      await fire('background');
      await fire('inactive');

      expect(mockGetBootstrap).toHaveBeenCalledTimes(1);
      expect(result.current).toEqual(IOS_UPDATE);
    });

    it('decides from the installed native version: the same minimum requires an update on 1.0.1 and not on 1.0.2', async () => {
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: null }));

      mockApplication.nativeApplicationVersion = '1.0.1';
      const older = await renderHook(() => useForceUpdate());
      await waitFor(() => expect(older.result.current).toEqual(IOS_UPDATE));
      await act(async () => {
        older.unmount();
      });

      mockApplication.nativeApplicationVersion = '1.0.2';
      const current = await renderHook(() => useForceUpdate());
      await settle();
      expect(current.result.current).toBeNull();
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

    it('compares only the iOS minimum on iOS and ignores the Android one', async () => {
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: null, android: '9.0.0' }));

      const { result } = await renderHook(() => useForceUpdate());
      await settle();

      expect(result.current).toBeNull();
    });

    it('compares only the Android minimum on Android and ignores the iOS one', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '9.0.0', android: null }));

      const { result } = await renderHook(() => useForceUpdate());
      await settle();

      expect(result.current).toBeNull();
    });
  });

  describe('OTA update', () => {
    it('returns the OTA update when one has downloaded', async () => {
      mockUpdates.isUpdatePending = true;
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: null, android: null }));

      const { result } = await renderHook(() => useForceUpdate());
      await settle();

      expect(result.current).toEqual(OTA_UPDATE);
    });

    it('returns null for an OTA update when updates are disabled (the simulator and Expo Go)', async () => {
      mockUpdates.isEnabled = false;
      mockUpdates.isUpdatePending = true;
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: null, android: null }));

      const { result } = await renderHook(() => useForceUpdate());
      await settle();

      expect(result.current).toBeNull();
    });

    it('returns null when no OTA update is pending', async () => {
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: null, android: null }));

      const { result } = await renderHook(() => useForceUpdate());
      await settle();

      expect(result.current).toBeNull();
    });

    it('prefers the store update over a pending OTA update, since an OTA cannot fix an old binary', async () => {
      mockUpdates.isUpdatePending = true;
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: null }));

      const { result } = await renderHook(() => useForceUpdate());

      await waitFor(() => expect(result.current).toEqual(IOS_UPDATE));
    });

    it('checks for and fetches an OTA update on each foreground, and shows it once one has downloaded', async () => {
      const fire = listenForAppState();
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: null, android: null }));
      mockCheckForUpdate.mockResolvedValue({ isAvailable: true } as Awaited<ReturnType<typeof Updates.checkForUpdateAsync>>);

      const { result, rerender } = await renderHook(() => useForceUpdate());
      await settle();
      expect(result.current).toBeNull();

      mockUpdates.isUpdatePending = true;
      await fire('active');
      await act(async () => {
        rerender(undefined);
      });

      expect(mockGetBootstrap).toHaveBeenCalledTimes(2);
      expect(mockCheckForUpdate).toHaveBeenCalledTimes(1);
      expect(mockFetchUpdate).toHaveBeenCalledTimes(1);
      expect(result.current).toEqual(OTA_UPDATE);
    });

    it('does not fetch when a foreground check finds no OTA update', async () => {
      const fire = listenForAppState();
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: null, android: null }));

      await renderHook(() => useForceUpdate());
      await fire('active');

      expect(mockCheckForUpdate).toHaveBeenCalledTimes(1);
      expect(mockFetchUpdate).not.toHaveBeenCalled();
    });

    it('does not check for an OTA update when updates are disabled', async () => {
      const fire = listenForAppState();
      mockUpdates.isEnabled = false;
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: null, android: null }));

      await renderHook(() => useForceUpdate());
      await fire('active');

      expect(mockCheckForUpdate).not.toHaveBeenCalled();
    });

    it('stays quiet when the OTA check fails while offline', async () => {
      const fire = listenForAppState();
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: null, android: null }));
      mockCheckForUpdate.mockRejectedValue(new Error('offline'));

      const { result } = await renderHook(() => useForceUpdate());
      await fire('active');

      expect(result.current).toBeNull();
    });
  });

  describe('on iOS', () => {
    it('returns null on a sheet and closes the screens above the tabs once an update is required', async () => {
      mockSegments.value = SHEET;
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: null }));

      const { result, rerender } = await renderHook(() => useForceUpdate());
      await settle();

      expect(mockDismissAll).toHaveBeenCalledTimes(1);
      expect(result.current).toBeNull();

      mockSegments.value = TABS;
      await act(async () => {
        rerender(undefined);
      });

      expect(result.current).toEqual(IOS_UPDATE);
      expect(mockDismissAll).toHaveBeenCalledTimes(1);
    });

    it('closes the sheets for a pending OTA update too', async () => {
      mockSegments.value = SHEET;
      mockUpdates.isUpdatePending = true;
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: null, android: null }));

      const { result, rerender } = await renderHook(() => useForceUpdate());
      await settle();

      expect(mockDismissAll).toHaveBeenCalledTimes(1);
      expect(result.current).toBeNull();

      mockSegments.value = TABS;
      await act(async () => {
        rerender(undefined);
      });

      expect(result.current).toEqual(OTA_UPDATE);
    });

    it('does not dismiss when there is nothing to show', async () => {
      mockSegments.value = SHEET;
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.1', android: null }));

      await renderHook(() => useForceUpdate());
      await settle();

      expect(mockDismissAll).not.toHaveBeenCalled();
    });

    it('does not dismiss when the stack cannot be dismissed', async () => {
      mockSegments.value = SHEET;
      mockCanDismiss.mockReturnValue(false);
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: null }));

      const { result } = await renderHook(() => useForceUpdate());
      await settle();

      expect(mockDismissAll).not.toHaveBeenCalled();
      expect(result.current).toBeNull();
    });

    it('shows the update during onboarding without closing anything', async () => {
      mockSegments.value = ONBOARDING;
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: null }));

      const { result } = await renderHook(() => useForceUpdate());

      await waitFor(() => expect(result.current).toEqual(IOS_UPDATE));
      expect(mockDismissAll).not.toHaveBeenCalled();
    });

    it('neither shows nor closes anything while the index route redirects (no segments yet)', async () => {
      mockSegments.value = [];
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: null }));

      const { result } = await renderHook(() => useForceUpdate());
      await settle();

      expect(mockGetBootstrap).toHaveBeenCalled();
      expect(result.current).toBeNull();
      expect(mockDismissAll).not.toHaveBeenCalled();
    });
  });

  describe('on Android', () => {
    it('shows the update on a sheet without closing anything', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      mockSegments.value = SHEET;
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: null, android: '1.0.2' }));

      const { result } = await renderHook(() => useForceUpdate());

      await waitFor(() => expect(result.current).toEqual(ANDROID_UPDATE));
      expect(mockDismissAll).not.toHaveBeenCalled();
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
