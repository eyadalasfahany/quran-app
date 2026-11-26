import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useContentDb } from '@/core/db/content/open';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { ensureSelectedMushafDownloaded } from './auto-download';
import { useAutoMushafDownload } from './useAutoMushafDownload';
import { bumpCatalogVersion } from '@/core/sync/catalog-version';

jest.mock('@/core/db/content/open', () => ({ useContentDb: jest.fn() }));
jest.mock('./auto-download', () => ({ ensureSelectedMushafDownloaded: jest.fn(() => Promise.resolve()) }));

const mockReady = jest.mocked(useContentDb);
const mockEnsure = jest.mocked(ensureSelectedMushafDownloaded);

let appStateChange: ((state: AppStateStatus) => void) | undefined;
let remove: jest.Mock;

function setAppState(state: AppStateStatus) {
  Object.defineProperty(AppState, 'currentState', { configurable: true, get: () => state });
}

function setReady(ready: boolean) {
  mockReady.mockReturnValue({ ready, error: null });
}

beforeEach(() => {
  mockEnsure.mockClear();
  mockReady.mockReset();
  setReady(true);
  setAppState('active');
  storage.set(storageKeys.onboardingCompleted, true);
  appStateChange = undefined;
  remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    appStateChange = handler;
    return { remove } as never;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  storage.remove(storageKeys.onboardingCompleted);
});

describe('useAutoMushafDownload', () => {
  it('does nothing before onboarding is complete, including on a foreground', async () => {
    storage.remove(storageKeys.onboardingCompleted);
    setAppState('background');

    await renderHook(() => useAutoMushafDownload());
    await act(async () => appStateChange?.('active'));

    expect(mockEnsure).not.toHaveBeenCalled();
  });

  it('does nothing while the content database is not ready', async () => {
    setReady(false);

    await renderHook(() => useAutoMushafDownload());

    expect(mockEnsure).not.toHaveBeenCalled();
  });

  it('starts the selected download once on mount when ready', async () => {
    await renderHook(() => useAutoMushafDownload());

    expect(mockEnsure).toHaveBeenCalledTimes(1);
  });

  it('checks again when a content sync changes the catalogue (a newer pack version is an update)', async () => {
    await renderHook(() => useAutoMushafDownload());
    expect(mockEnsure).toHaveBeenCalledTimes(1);

    await act(async () => bumpCatalogVersion());

    expect(mockEnsure).toHaveBeenCalledTimes(2);
  });

  it('starts it again when the app returns to the foreground', async () => {
    await renderHook(() => useAutoMushafDownload());

    await act(async () => appStateChange?.('background'));
    await act(async () => appStateChange?.('active'));

    expect(mockEnsure).toHaveBeenCalledTimes(2);
  });

  it('does not start it twice for one foreground', async () => {
    await renderHook(() => useAutoMushafDownload());

    await act(async () => appStateChange?.('background'));
    await act(async () => appStateChange?.('active'));
    await act(async () => appStateChange?.('active'));

    expect(mockEnsure).toHaveBeenCalledTimes(2);
  });

  it('removes the app state listener on unmount', async () => {
    const view = await renderHook(() => useAutoMushafDownload());

    await act(async () => view.unmount());

    expect(remove).toHaveBeenCalled();
  });
});
