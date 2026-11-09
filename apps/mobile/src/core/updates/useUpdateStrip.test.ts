import { act, renderHook } from '@testing-library/react-native';
import { AppState, DevSettings, type AppStateStatus } from 'react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { useUpdateStrip } from './useUpdateStrip';

// Read lazily by the mock, so each test can change them (jest.mock factories are hoisted above these declarations).
const mockUpdates = {
  enabled: true,
  pending: false,
  updateId: 'update-1' as string | undefined,
  url: null as string | null,
};
const mockCheckForUpdateAsync = jest.fn();
const mockFetchUpdateAsync = jest.fn();
const mockReloadAsync = jest.fn();

jest.mock('expo-updates', () => ({
  get isEnabled() {
    return mockUpdates.enabled;
  },
  useUpdates: () => ({
    isUpdatePending: mockUpdates.pending,
    downloadedUpdate: mockUpdates.updateId === undefined ? undefined : { updateId: mockUpdates.updateId },
  }),
  checkForUpdateAsync: () => mockCheckForUpdateAsync(),
  fetchUpdateAsync: () => mockFetchUpdateAsync(),
  reloadAsync: () => mockReloadAsync(),
}));

jest.mock('expo-linking', () => ({
  useURL: () => mockUpdates.url,
}));

const HOUR = 60 * 60 * 1000;

function setPending(updateId: string | undefined = 'update-1') {
  mockUpdates.pending = true;
  mockUpdates.updateId = updateId;
}

describe('useUpdateStrip', () => {
  beforeEach(() => {
    storage.clearAll();
    mockUpdates.enabled = true;
    mockUpdates.pending = false;
    mockUpdates.updateId = 'update-1';
    mockUpdates.url = null;
    mockCheckForUpdateAsync.mockReset().mockResolvedValue({ isAvailable: false });
    mockFetchUpdateAsync.mockReset().mockResolvedValue({ isNew: true });
    mockReloadAsync.mockReset().mockResolvedValue(undefined);
    jest.restoreAllMocks();
  });

  describe('visibility', () => {
    it('is hidden when no update is pending', async () => {
      const { result } = await renderHook(() => useUpdateStrip());

      expect(result.current.visible).toBe(false);
    });

    it('is visible once an update is downloaded and pending', async () => {
      setPending();
      const { result } = await renderHook(() => useUpdateStrip());

      expect(result.current.visible).toBe(true);
    });

    it('stays visible until the update is applied, with no way to hide it', async () => {
      setPending();
      const { result } = await renderHook(() => useUpdateStrip());

      expect(result.current.visible).toBe(true);
      expect(Object.keys(result.current).sort()).toEqual(['update', 'visible']);
    });

    it('is hidden when a downloaded update has no id', async () => {
      mockUpdates.pending = true;
      mockUpdates.updateId = undefined;
      const { result } = await renderHook(() => useUpdateStrip());

      expect(result.current.visible).toBe(false);
    });

    it('is hidden when expo-updates is not enabled, even with a pending update', async () => {
      setPending();
      mockUpdates.enabled = false;
      const { result } = await renderHook(() => useUpdateStrip());

      expect(result.current.visible).toBe(false);
    });
  });

  describe('foreground check', () => {
    function captureAppState() {
      let onChange: ((state: AppStateStatus) => void) | undefined;
      jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
        onChange = handler;
        return { remove: jest.fn() };
      });
      return (state: AppStateStatus) => onChange?.(state);
    }

    it('checks and fetches when the app returns to the foreground after six hours', async () => {
      const emit = captureAppState();
      storage.set(storageKeys.updates.lastCheckAt, String(Date.now() - 7 * HOUR));
      mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: true });
      await renderHook(() => useUpdateStrip());

      await act(async () => {
        emit('active');
      });

      expect(mockCheckForUpdateAsync).toHaveBeenCalledTimes(1);
      expect(mockFetchUpdateAsync).toHaveBeenCalledTimes(1);
    });

    it('does not check again within six hours', async () => {
      const emit = captureAppState();
      storage.set(storageKeys.updates.lastCheckAt, String(Date.now() - HOUR));
      await renderHook(() => useUpdateStrip());

      await act(async () => {
        emit('active');
      });

      expect(mockCheckForUpdateAsync).not.toHaveBeenCalled();
    });

    it('ignores background and inactive states', async () => {
      const emit = captureAppState();
      await renderHook(() => useUpdateStrip());

      await act(async () => {
        emit('background');
        emit('inactive');
      });

      expect(mockCheckForUpdateAsync).not.toHaveBeenCalled();
    });

    it('stamps the check time and does not fetch when nothing is available', async () => {
      const emit = captureAppState();
      await renderHook(() => useUpdateStrip());

      await act(async () => {
        emit('active');
      });

      expect(mockFetchUpdateAsync).not.toHaveBeenCalled();
      expect(Number(storage.getString(storageKeys.updates.lastCheckAt))).toBeGreaterThan(Date.now() - HOUR);
    });

    it('does not check when expo-updates is not enabled', async () => {
      const emit = captureAppState();
      mockUpdates.enabled = false;
      await renderHook(() => useUpdateStrip());

      await act(async () => {
        emit('active');
      });

      expect(mockCheckForUpdateAsync).not.toHaveBeenCalled();
    });

    it('catches a failing check and does not throw', async () => {
      const emit = captureAppState();
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      mockCheckForUpdateAsync.mockRejectedValue(new Error('offline'));
      await renderHook(() => useUpdateStrip());

      await act(async () => {
        emit('active');
      });

      expect(warn).toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    it('reloads through expo-updates', async () => {
      setPending();
      const { result } = await renderHook(() => useUpdateStrip());

      await act(async () => {
        result.current.update();
      });

      expect(mockReloadAsync).toHaveBeenCalledTimes(1);
    });

    it('catches a failing reload and does not throw', async () => {
      setPending();
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      mockReloadAsync.mockRejectedValue(new Error('reload failed'));
      const { result } = await renderHook(() => useUpdateStrip());

      await act(async () => {
        result.current.update();
      });

      expect(warn).toHaveBeenCalled();
    });
  });

  describe('dev preview (previewUpdateStrip=1)', () => {
    it('shows the strip with no pending update', async () => {
      mockUpdates.url = 'taybah-dev://?previewUpdateStrip=1';
      const { result } = await renderHook(() => useUpdateStrip());

      expect(result.current.visible).toBe(true);
    });

    it('reloads the dev app instead of calling expo-updates', async () => {
      mockUpdates.url = 'taybah-dev://?previewUpdateStrip=1';
      const reload = jest.spyOn(DevSettings, 'reload').mockImplementation(() => undefined);
      const { result } = await renderHook(() => useUpdateStrip());

      await act(async () => {
        result.current.update();
      });

      expect(reload).toHaveBeenCalledTimes(1);
      expect(mockReloadAsync).not.toHaveBeenCalled();
    });

    it('ignores other URLs', async () => {
      mockUpdates.url = 'taybah-dev://salah';
      const { result } = await renderHook(() => useUpdateStrip());

      expect(result.current.visible).toBe(false);
    });
  });
});
