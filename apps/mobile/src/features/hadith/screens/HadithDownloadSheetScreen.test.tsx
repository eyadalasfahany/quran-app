import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useContentDb } from '@/core/db/content/open';
import { useOnline } from '@/core/network/useOnline';
import { installResource } from '@/core/sync';
import { getWifiOnlyDownloads, setWifiOnlyDownloads } from '@/features/audio/settings';
import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { collectionFixture } from '../../../../jest/hadith-ui-fixtures';
import { resetHadithDownloads, useHadithDownloads } from '../downloads';
import { useHadithCatalog, useInstalledHadithCollections } from '../hooks';
import type { HadithCatalogEntry } from '../types';

import { HadithDownloadSheetScreen } from './HadithDownloadSheetScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/core/db/content/open', () => ({
  useContentDb: jest.fn(() => ({ ready: true, error: null })),
  openContentDb: jest.fn(() => {
    throw new Error('not under test');
  }),
}));

jest.mock('@/core/network/useOnline', () => ({ useOnline: jest.fn(() => true) }));

jest.mock('@/core/sync', () => ({
  installResource: jest.fn(() => new Promise(() => undefined)),
  runDeviceContentSync: jest.fn(() => Promise.resolve()),
}));

jest.mock('../hooks', () => ({
  useHadithCatalog: jest.fn(() => []),
  useInstalledHadithCollections: jest.fn(() => []),
}));

// Placeholders only.
const AVAILABLE: HadithCatalogEntry = {
  resourceId: 2,
  name: '[Available name]',
  nameAr: '[اسم مجموعة متاحة]',
  version: 1,
  packSizeBytes: 10276044,
  installed: false,
  slug: null,
};

describe('HadithDownloadSheetScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetHadithDownloads();
    jest.mocked(useOnline).mockReturnValue(true);
    jest.mocked(useContentDb).mockReturnValue({ ready: true, error: null });
    jest.mocked(useHadithCatalog).mockReturnValue([AVAILABLE]);
    jest.mocked(useInstalledHadithCollections).mockReturnValue([]);
    setWifiOnlyDownloads(true);
  });

  it('shows the sheet for the resource in the URL', async () => {
    await renderUi(<HadithDownloadSheetScreen resourceId={2} />);
    expect(screen.getByTestId('hadith-download-sheet-title')).toHaveTextContent('[اسم مجموعة متاحة]');
    expect(screen.getByText('تنزيل المجموعة')).toBeOnTheScreen();
  });

  it('starts the download from the button', async () => {
    await renderUi(<HadithDownloadSheetScreen resourceId={2} />);
    await press(screen.getByTestId('hadith-download-sheet-start'));
    expect(installResource).toHaveBeenCalledWith(2, expect.anything());
  });

  it('shows progress and cancels', async () => {
    let signal: AbortSignal | undefined;
    jest.mocked(installResource).mockImplementation((_id, options = {}) => {
      signal = options.signal;
      return new Promise(() => undefined);
    });
    await act(async () => {
      void useHadithDownloads.getState().start(2);
    });
    await renderUi(<HadithDownloadSheetScreen resourceId={2} />);
    expect(screen.getByRole('progressbar')).toBeOnTheScreen();
    await press(screen.getByRole('button', { name: 'إلغاء' }));
    expect(signal?.aborted).toBe(true);
  });

  it('closes when the collection becomes installed', async () => {
    jest.mocked(useHadithCatalog).mockReturnValue([{ ...AVAILABLE, installed: true, slug: 'bukhari' }]);
    jest.mocked(useInstalledHadithCollections).mockReturnValue([
      collectionFixture({ resourceId: 2, slug: 'bukhari' }),
    ]);
    await renderUi(<HadithDownloadSheetScreen resourceId={2} />);
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('shows not-found for an unknown resource', async () => {
    await renderUi(<HadithDownloadSheetScreen resourceId={999} />);
    expect(screen.getByText('المحتوى غير متوفر')).toBeOnTheScreen();
    expect(screen.queryByTestId('hadith-download-sheet-start')).toBeNull();
  });

  it('shows not-found when there is no resource', async () => {
    await renderUi(<HadithDownloadSheetScreen resourceId={null} />);
    expect(screen.getByText('المحتوى غير متوفر')).toBeOnTheScreen();
  });

  it('the Wi-Fi toggle writes the audio setting', async () => {
    await renderUi(<HadithDownloadSheetScreen resourceId={2} />);
    fireEvent(screen.getByRole('switch', { name: 'على شبكة Wi-Fi فقط' }), 'valueChange', false);
    expect(getWifiOnlyDownloads()).toBe(false);
  });

  it('shows the wait-for-Wi-Fi line when the store records reason wifi', async () => {
    useHadithDownloads.setState({ byId: { 2: { status: 'failed', progress: 0, reason: 'wifi' } } });
    await renderUi(<HadithDownloadSheetScreen resourceId={2} />);
    expect(screen.getByText('يبدأ التنزيل عند الاتصال بشبكة Wi-Fi.')).toBeOnTheScreen();
  });

  it('the close button goes back when there is history', async () => {
    await renderUi(<HadithDownloadSheetScreen resourceId={2} />);
    await press(screen.getByRole('button', { name: 'إغلاق' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
