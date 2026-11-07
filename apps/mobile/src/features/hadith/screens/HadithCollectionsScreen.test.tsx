import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useContentDb } from '@/core/db/content/open';
import { useOnline } from '@/core/network/useOnline';
import { installResource, runDeviceContentSync } from '@/core/sync';
import { locales, renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { collectionFixture } from '../../../../jest/hadith-ui-fixtures';
import { resetHadithDownloads, useHadithDownloads } from '../downloads';
import { useHadithCatalog, useInstalledHadithCollections } from '../hooks';
import type { HadithCatalogEntry, HadithCollection } from '../types';

import { HadithCollectionsScreen } from './HadithCollectionsScreen';

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

// Placeholders only: no real hadith text, titles or authors.
const INSTALLED_ENTRY: HadithCatalogEntry = {
  resourceId: 1,
  name: '[Collection name]',
  nameAr: '[اسم المجموعة]',
  authorEn: null,
  authorAr: null,
  version: 1,
  packSizeBytes: 1048576,
  installed: true,
  slug: 'bukhari',
};
const AVAILABLE_ENTRY: HadithCatalogEntry = {
  resourceId: 2,
  name: '[Available name]',
  nameAr: '[اسم مجموعة متاحة]',
  authorEn: null,
  authorAr: null,
  version: 1,
  packSizeBytes: 10276044,
  installed: false,
  slug: null,
};
const DOWNLOADING_ENTRY: HadithCatalogEntry = { ...AVAILABLE_ENTRY, resourceId: 3, nameAr: '[اسم مجموعة تنزل]', name: '[Downloading name]' };
const FAILED_ENTRY: HadithCatalogEntry = { ...AVAILABLE_ENTRY, resourceId: 4, nameAr: '[اسم مجموعة فشلت]', name: '[Failed name]' };
const INSTALLED_COLLECTION: HadithCollection = collectionFixture({ resourceId: 1, slug: 'bukhari', number: 1, titleAr: '[اسم المجموعة]', titleEn: '[Collection name]' });

const ROW_PATTERN = /^hadith-collection-row-\d+$/;

function setCatalog(entries: HadithCatalogEntry[], installed: HadithCollection[] = []) {
  jest.mocked(useHadithCatalog).mockReturnValue(entries);
  jest.mocked(useInstalledHadithCollections).mockReturnValue(installed);
}

function rowIds(): string[] {
  return screen.getAllByTestId(ROW_PATTERN).map((node) => node.props.testID as string);
}

describe('HadithCollectionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetHadithDownloads();
    jest.mocked(useOnline).mockReturnValue(true);
    jest.mocked(useContentDb).mockReturnValue({ ready: true, error: null });
    setCatalog([INSTALLED_ENTRY, AVAILABLE_ENTRY], [INSTALLED_COLLECTION]);
  });

  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithCollectionsScreen />, { locale });
    expect(screen.getByTestId('screen-hadith-collections')).toBeOnTheScreen();
    expect(screen.getByText(locale === 'ar' ? 'الحديث' : 'Hadith')).toBeOnTheScreen();
    expect(screen.getByTestId('hadith-collection-row-1-title')).toHaveTextContent(locale === 'ar' ? '[اسم المجموعة]' : '[Collection name]');
  });

  it('lists installed, available, downloading and failed rows from the catalogue', async () => {
    setCatalog([INSTALLED_ENTRY, AVAILABLE_ENTRY, DOWNLOADING_ENTRY, FAILED_ENTRY], [INSTALLED_COLLECTION]);
    await act(async () => {
      void useHadithDownloads.getState().start(3);
      useHadithDownloads.setState((state) => ({ byId: { ...state.byId, 4: { status: 'failed', progress: 0 } } }));
    });
    await renderUi(<HadithCollectionsScreen />);
    expect(rowIds()).toEqual(['hadith-collection-row-1', 'hadith-collection-row-2', 'hadith-collection-row-3', 'hadith-collection-row-4']);
    expect(screen.getByTestId('hadith-collection-row-1-status')).toBeOnTheScreen();
    expect(screen.getByTestId('hadith-collection-row-2-download')).toBeOnTheScreen();
    expect(screen.getByTestId('hadith-collection-row-3-progress')).toBeOnTheScreen();
    expect(screen.getByTestId('hadith-collection-row-4-failed')).toBeOnTheScreen();
  });

  it('orders rows by the fixed collection order', async () => {
    setCatalog([FAILED_ENTRY, AVAILABLE_ENTRY, INSTALLED_ENTRY], [INSTALLED_COLLECTION]);
    await renderUi(<HadithCollectionsScreen />);
    expect(rowIds()).toEqual(['hadith-collection-row-1', 'hadith-collection-row-2', 'hadith-collection-row-4']);
  });

  it('an installed row opens the collection', async () => {
    await renderUi(<HadithCollectionsScreen />);
    await press(screen.getByTestId('hadith-collection-row-1-body'));
    expect(router.push).toHaveBeenCalledWith('/hadith/bukhari');
  });

  it('the download pill opens the sheet for that resource', async () => {
    await renderUi(<HadithCollectionsScreen />);
    await press(screen.getByTestId('hadith-collection-row-2-download'));
    expect(router.push).toHaveBeenCalledWith('/hadith/downloads?resource=2');
    expect(installResource).not.toHaveBeenCalled();
  });

  it('the cancel button cancels the install', async () => {
    setCatalog([INSTALLED_ENTRY, DOWNLOADING_ENTRY]);
    let signal: AbortSignal | undefined;
    jest.mocked(installResource).mockImplementation((_id, options = {}) => {
      signal = options.signal;
      return new Promise(() => undefined);
    });
    await act(async () => {
      void useHadithDownloads.getState().start(3);
    });
    await renderUi(<HadithCollectionsScreen />);
    await press(screen.getByTestId('hadith-collection-row-3-download'));
    expect(signal?.aborted).toBe(true);
  });

  it('the retry button restarts the install', async () => {
    setCatalog([INSTALLED_ENTRY, FAILED_ENTRY]);
    await act(async () => {
      useHadithDownloads.setState({ byId: { 4: { status: 'failed', progress: 0 } } });
    });
    await renderUi(<HadithCollectionsScreen />);
    await press(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(installResource).toHaveBeenCalledWith(4, expect.anything());
  });

  it('shows the credit footer', async () => {
    await renderUi(<HadithCollectionsScreen />);
    expect(screen.getByTestId('hadith-list-credit')).toHaveTextContent('المصدر: fawazahmed0/hadith-api · Unlicense');
  });

  it('the header search button opens search', async () => {
    await renderUi(<HadithCollectionsScreen />);
    await press(screen.getByRole('button', { name: 'بحث في الحديث' }));
    expect(router.push).toHaveBeenCalledWith('/hadith/search');
  });

  it('the header saved button opens the saved list', async () => {
    await renderUi(<HadithCollectionsScreen />);
    await press(screen.getByRole('button', { name: 'المحفوظات' }));
    expect(router.push).toHaveBeenCalledWith('/hadith/saved');
  });

  it('the header downloads button shows only when something is not installed', async () => {
    await renderUi(<HadithCollectionsScreen />);
    expect(screen.getByTestId('hadith-list-downloads')).toBeOnTheScreen();
    await press(screen.getByTestId('hadith-list-downloads'));
    expect(router.push).toHaveBeenCalledWith('/hadith/downloads?resource=2');
  });

  it('the header downloads button is hidden when every collection is installed', async () => {
    setCatalog([INSTALLED_ENTRY], [INSTALLED_COLLECTION]);
    await renderUi(<HadithCollectionsScreen />);
    expect(screen.queryByTestId('hadith-list-downloads')).toBeNull();
  });

  it('shows the loading state before the content database is ready', async () => {
    jest.mocked(useContentDb).mockReturnValue({ ready: false, error: null });
    await renderUi(<HadithCollectionsScreen />);
    expect(screen.getByLabelText('جارٍ التحميل')).toBeOnTheScreen();
    expect(screen.queryByTestId('hadith-collection-row-1')).toBeNull();
  });

  it('shows the offline state when the catalogue is empty and the device is offline', async () => {
    setCatalog([]);
    jest.mocked(useOnline).mockReturnValue(false);
    await renderUi(<HadithCollectionsScreen />);
    expect(screen.getByText('لا توجد مجموعات محمّلة')).toBeOnTheScreen();
  });

  it('shows the error state with a retry that runs a content sync', async () => {
    setCatalog([]);
    await renderUi(<HadithCollectionsScreen />);
    expect(screen.getByText('تعذّر تحميل المجموعات')).toBeOnTheScreen();
    await press(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(runDeviceContentSync).toHaveBeenCalledTimes(1);
  });

  it('offline: installed rows still open and available rows are disabled with the offline pill', async () => {
    jest.mocked(useOnline).mockReturnValue(false);
    await renderUi(<HadithCollectionsScreen />);
    await press(screen.getByTestId('hadith-collection-row-1-body'));
    expect(router.push).toHaveBeenCalledWith('/hadith/bukhari');
    expect(screen.getByRole('button', { name: 'تنزيل [اسم مجموعة متاحة]' })).toBeDisabled();
    expect(screen.getByTestId('hadith-collection-row-2-offline')).toBeOnTheScreen();
  });

  it('makes no network request on mount or on a row press', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    await renderUi(<HadithCollectionsScreen />);
    await press(screen.getByTestId('hadith-collection-row-1-body'));
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('shows no grade text', async () => {
    await renderUi(<HadithCollectionsScreen />);
    expect(screen.queryByText(/grade/i)).toBeNull();
    fireEvent.press(screen.getByTestId('hadith-list-search'));
    expect(router.push).toHaveBeenCalled();
  });
});
