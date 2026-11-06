import { fireEvent, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { useAzkarAvailable, useContinueAzkar } from '@/features/azkar/data';
import { useDuasAvailable } from '@/features/duas/data/hooks';
import { getChapter } from '@/features/reader/data/chapters';
import { getVerseByKey } from '@/features/reader/data/verses';
import { qiblaBearing } from '@/features/salah/data/prayer-times';
import { usePrayerLocation } from '@/features/salah/hooks';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { LANDSCAPE_PHONE, resetWindowSize, setWindowSize } from '../../../../jest/window-size';

import { MenuScreen } from './MenuScreen';

// Only the location (a device service), the databases and the last-read hook are replaced. The Qibla bearing, the
// prayer times, the Azkar hooks and the menu's own logic run for real. The bearing test uses the real qiblaBearing.
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), push: jest.fn() },
}));

jest.mock('@/features/salah/hooks', () => ({
  ...jest.requireActual('@/features/salah/hooks'),
  usePrayerLocation: jest.fn(),
}));

jest.mock('@/features/azkar/data', () => ({
  ...jest.requireActual('@/features/azkar/data'),
  useAzkarAvailable: jest.fn(() => false),
  useContinueAzkar: jest.fn(() => null),
}));

jest.mock('@/features/duas/data/hooks', () => ({
  ...jest.requireActual('@/features/duas/data/hooks'),
  useDuasAvailable: jest.fn(() => true),
  useMyDuas: jest.fn(() => []),
}));

jest.mock('@/features/khatma/data/hooks', () => ({
  useActivePlan: () => ({ data: [] }),
  usePlanLogs: () => ({ data: [] }),
  useKhatmaMarkerVerseId: () => null,
}));

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => ({ db: {}, executor: {} }),
  useContentDb: () => ({ error: null, ready: true }),
}));

jest.mock('@/features/reader/data/verses', () => ({ getVerseByKey: jest.fn() }));
jest.mock('@/features/reader/data/chapters', () => ({
  ...jest.requireActual('@/features/reader/data/chapters'),
  getChapter: jest.fn(),
}));
jest.mock('@/features/reader/anchor/useLastReadVerseKey', () => ({
  useLastReadVerseKey: () => '2:255',
}));

// London: a fixed location, so the bearing has a known value.
const LONDON = { lat: 51.5074, lng: -0.1278 };

const reading = { verseKey: '2:255', verseNumber: 255, page: 42, chapterId: 2 };

function withLocation(coords: { lat: number; lng: number } | null) {
  jest.mocked(usePrayerLocation).mockReturnValue({
    source: 'auto',
    coords,
    permissionStatus: 'granted',
    refresh: jest.fn(),
  } as never);
}

function withAzkar(available: boolean, scope: object | null = null, completed = 0) {
  jest.mocked(useAzkarAvailable).mockReturnValue(available);
  jest.mocked(useContinueAzkar).mockReturnValue(scope ? ({ scope, completed } as never) : null);
}

function withDuas(available: boolean) {
  jest.mocked(useDuasAvailable).mockReturnValue(available);
}

const categoryScope = {
  scopeKey: 'category:morning',
  periodKey: 'day:2026-11-01',
  total: 24,
  categoryId: 'morning',
  entryKey: null,
  occasion: 'morning',
};

const entryScope = {
  scopeKey: 'entry:entry:1',
  periodKey: 'session',
  total: 3,
  categoryId: null,
  entryKey: 'entry:1',
  occasion: null,
};

describe('MenuScreen', () => {
  beforeEach(() => {
    jest.mocked(router.navigate).mockClear();
    jest.mocked(router.push).mockClear();
    withLocation(LONDON);
    withAzkar(false);
    withDuas(true);
    jest.mocked(getVerseByKey).mockReturnValue(reading as never);
    jest.mocked(getChapter).mockReturnValue({ nameArabic: 'البقرة', nameSimple: 'Al-Baqarah' } as never);
    storage.set(storageKeys.readerLastVerseKey, '2:255');
  });

  afterEach(() => {
    storage.remove(storageKeys.readerLastVerseKey);
  });

  it('shows the title and the cards in Arabic', async () => {
    await renderUi(<MenuScreen />);

    expect(screen.getByRole('header', { name: 'القائمة' })).toBeOnTheScreen();
    expect(screen.getByTestId('menu-card-salah')).toBeOnTheScreen();
    expect(screen.getByTestId('menu-card-qibla')).toBeOnTheScreen();
    expect(screen.getByTestId('menu-card-sources')).toBeOnTheScreen();
  });

  it('shows the Qibla bearing from the real calculation, not a stub', async () => {
    const expected = `${Math.round(qiblaBearing(LONDON))}° from true north`;
    await renderUi(<MenuScreen />, { locale: 'en' });

    expect(screen.getByTestId('menu-card-qibla-preview')).toHaveTextContent(expected);
  });

  it('shows the next prayer with its clock time', async () => {
    await renderUi(<MenuScreen />, { locale: 'en' });

    expect(screen.getByTestId('menu-card-salah-preview')).toHaveTextContent(/\d{1,2}:\d{2} (AM|PM) · in /);
  });

  it('shows a neutral prayer subtitle without a location', async () => {
    withLocation(null);
    await renderUi(<MenuScreen />, { locale: 'en' });

    expect(screen.getByTestId('menu-card-salah-preview')).toHaveTextContent('Prayer times for your location');
    expect(screen.getByTestId('menu-card-qibla-preview')).toHaveTextContent('Direction of the Kaaba from your location');
  });

  describe('continue cards', () => {
    it('shows «تابع القراءة» with the surah and the saved ayah and page, opening that ayah', async () => {
      await renderUi(<MenuScreen />);

      expect(screen.getByTestId('menu-card-continue-reading-preview')).toHaveTextContent('الآية ٢٥٥ · صفحة ٤٢');
      await fireEvent.press(screen.getByTestId('menu-card-continue-reading'));
      expect(router.push).toHaveBeenLastCalledWith('/read/2:255?place=1');
    });

    it('hides «تابع القراءة» on a fresh install, with nothing saved', async () => {
      storage.remove(storageKeys.readerLastVerseKey);
      await renderUi(<MenuScreen />);

      expect(screen.queryByTestId('menu-card-continue-reading')).toBeNull();
    });

    it('shows «تابع الأذكار» with the scope in progress, opening its reader', async () => {
      withAzkar(true, categoryScope, 12);
      await renderUi(<MenuScreen />);

      expect(screen.getByTestId('menu-card-continue-azkar-preview')).toHaveTextContent('١٢ من ٢٤');
      expect(flatStyle(screen.getByTestId('menu-card-continue-azkar-progress').props.style).width).toBe('50%');
      await fireEvent.press(screen.getByTestId('menu-card-continue-azkar'));
      expect(router.push).toHaveBeenLastCalledWith('/azkar/read/morning');
    });

    it('opens an entry-scope resume in the entry reader', async () => {
      withAzkar(true, entryScope, 1);
      await renderUi(<MenuScreen />);

      await fireEvent.press(screen.getByTestId('menu-card-continue-azkar'));
      expect(router.push).toHaveBeenLastCalledWith('/azkar/entry/entry%3A1');
    });

    it('hides «تابع الأذكار» when nothing is in progress', async () => {
      withAzkar(true, null);
      await renderUi(<MenuScreen />);

      expect(screen.queryByTestId('menu-card-continue-azkar')).toBeNull();
    });

    it('puts the continue cards first in the grid', async () => {
      withAzkar(true, categoryScope, 12);
      await renderUi(<MenuScreen />);

      expect(screen.getByTestId('menu-grid-column-0')).toContainElement(screen.getByTestId('menu-card-continue-reading'));
      expect(screen.getByTestId('menu-grid-column-1')).toContainElement(screen.getByTestId('menu-card-continue-azkar'));
    });
  });

  describe('Duas card', () => {
    it('hides the Duas card when Duas is unavailable', async () => {
      withDuas(false);
      await renderUi(<MenuScreen />);

      expect(screen.queryByTestId('menu-card-duas')).toBeNull();
    });

    it('shows the Duas card and opens /duas when Duas is available', async () => {
      withDuas(true);
      await renderUi(<MenuScreen />);

      expect(screen.getByTestId('menu-card-duas')).toBeOnTheScreen();
      await fireEvent.press(screen.getByTestId('menu-card-duas'));
      expect(router.push).toHaveBeenLastCalledWith('/duas');
    });
  });

  describe('Azkar cards', () => {
    it('hides the Azkar cards without Azkar content', async () => {
      withAzkar(false);
      await renderUi(<MenuScreen />);

      expect(screen.queryByTestId('menu-card-azkar')).toBeNull();
      expect(screen.queryByTestId('menu-card-azkar-favorites')).toBeNull();
    });

    it('shows the plain Azkar card and Favourites with Azkar content, opening Azkar and its favourites', async () => {
      withAzkar(true, null);
      await renderUi(<MenuScreen />);

      await fireEvent.press(screen.getByTestId('menu-card-azkar'));
      expect(router.push).toHaveBeenLastCalledWith('/azkar');
      await fireEvent.press(screen.getByTestId('menu-card-azkar-favorites'));
      expect(router.push).toHaveBeenLastCalledWith('/azkar/favorites');
    });
  });

  describe('Khatma', () => {
    it('hides the Khatma preview line without an active plan', async () => {
      await renderUi(<MenuScreen />);

      expect(screen.getByTestId('menu-card-khatma')).toBeOnTheScreen();
      expect(screen.queryByTestId('menu-card-khatma-preview')).toBeNull();
    });
  });

  it('opens the Salah screen at /salah from its card, not the hidden (salah) tab', async () => {
    await renderUi(<MenuScreen />);

    await fireEvent.press(screen.getByTestId('menu-card-salah'));
    expect(router.push).toHaveBeenLastCalledWith('/salah');
    expect(router.navigate).not.toHaveBeenCalledWith('/(main)/(salah)');
  });

  it('opens the Qibla screen, Khatma, settings and sources from their cards', async () => {
    await renderUi(<MenuScreen />);

    await fireEvent.press(screen.getByTestId('menu-card-qibla'));
    expect(router.push).toHaveBeenLastCalledWith('/salah/qibla');
    await fireEvent.press(screen.getByTestId('menu-card-khatma'));
    expect(router.push).toHaveBeenLastCalledWith('/khatma');
    await fireEvent.press(screen.getByTestId('menu-card-settings'));
    expect(router.push).toHaveBeenLastCalledWith('/settings');
    await fireEvent.press(screen.getByTestId('menu-card-sources'));
    expect(router.push).toHaveBeenLastCalledWith('/settings/sources');
  });

  it('opens the three tab cards', async () => {
    await renderUi(<MenuScreen />);

    expect(screen.queryByTestId('menu-card-home')).toBeNull();
    await fireEvent.press(screen.getByTestId('menu-card-mushaf'));
    expect(router.navigate).toHaveBeenLastCalledWith('/(main)/(mushaf)');
    await fireEvent.press(screen.getByTestId('menu-card-listen'));
    expect(router.navigate).toHaveBeenLastCalledWith('/(main)/(listen)');
    await fireEvent.press(screen.getByTestId('menu-card-my-quran'));
    expect(router.navigate).toHaveBeenLastCalledWith('/(main)/(my-quran)');
  });

  describe('search card caption', () => {
    it('reads «في القرآن والأذكار» once Azkar content is installed', async () => {
      withAzkar(true);
      await renderUi(<MenuScreen />);

      expect(within(screen.getByTestId('menu-card-search')).getByText('في القرآن والأذكار')).toBeOnTheScreen();
    });

    it('reads «في القرآن» without Azkar content', async () => {
      withAzkar(false);
      await renderUi(<MenuScreen />);

      expect(within(screen.getByTestId('menu-card-search')).getByText('في القرآن')).toBeOnTheScreen();
      expect(within(screen.getByTestId('menu-card-search')).queryByText('في القرآن والأذكار')).toBeNull();
    });

    it('reads "In the Quran and Azkar" in English once Azkar content is installed', async () => {
      withAzkar(true);
      await renderUi(<MenuScreen />, { locale: 'en' });

      expect(within(screen.getByTestId('menu-card-search')).getByText('In the Quran and Azkar')).toBeOnTheScreen();
    });

    it('reads "In the Quran" in English without Azkar content', async () => {
      withAzkar(false);
      await renderUi(<MenuScreen />, { locale: 'en' });

      expect(within(screen.getByTestId('menu-card-search')).getByText('In the Quran')).toBeOnTheScreen();
    });
  });

  it('opens search from its card and from the header button', async () => {
    await renderUi(<MenuScreen />);

    await fireEvent.press(screen.getByTestId('menu-card-search'));
    expect(router.push).toHaveBeenLastCalledWith('/search');
    await fireEvent.press(screen.getByRole('button', { name: 'بحث' }));
    expect(router.push).toHaveBeenLastCalledWith('/search');
  });

  describe('search button in the header (as Home)', () => {
    it('sits in the header, at the top of the scrolling list, before the grid', async () => {
      await renderUi(<MenuScreen />);

      const list = screen.getByTestId('menu-scroll');
      expect(within(list).getByTestId('menu-title')).toBeOnTheScreen();
      expect(within(screen.getByTestId('menu-title')).getByTestId('menu-search')).toBeOnTheScreen();
      expect(within(list).getByTestId('menu-grid-column-0')).toBeOnTheScreen();
    });

    it('is not a floating button any more', async () => {
      await renderUi(<MenuScreen />);

      expect(screen.queryByTestId('menu-search-row')).toBeNull();
    });

    it.each(locales)('shares the title row, with no forced direction, in %s', async (locale) => {
      await renderUi(<MenuScreen />, { locale });

      // The header's flex row holds the title and the button. It has no `direction` override, so the row mirrors with
      // the reading direction: the button sits on the left in Arabic and on the right in English, as on Home.
      const title = locale === 'ar' ? 'القائمة' : 'Menu';
      let row = screen.getByRole('header', { name: title }).parent;
      while (row && !within(row).queryByTestId('menu-search')) {
        row = row.parent;
      }
      expect(row).not.toBeNull();
      expect(within(row as NonNullable<typeof row>).getByRole('header', { name: title })).toBeOnTheScreen();
      expect(flatStyle(row?.props.style)).toMatchObject({ flexDirection: 'row' });
      expect(flatStyle(row?.props.style).direction).toBeUndefined();
    });

    it.each(locales)('is labelled for search in %s and pushes /search', async (locale) => {
      await renderUi(<MenuScreen />, { locale });

      const button = screen.getByRole('button', { name: locale === 'ar' ? 'بحث' : 'Search' });
      expect(button).toBeOnTheScreen();
      await fireEvent.press(button);
      expect(router.push).toHaveBeenLastCalledWith('/search');
    });

    it.each([
      ['a phone in portrait', 390, 844],
      ['a short window, a landscape phone', LANDSCAPE_PHONE.width, LANDSCAPE_PHONE.height],
      ['a tablet', 1024, 1366],
    ])('appears on %s', async (_label, width, height) => {
      setWindowSize(width, height);
      try {
        await renderUi(<MenuScreen />);

        expect(within(screen.getByTestId('menu-title')).getByTestId('menu-search')).toBeOnTheScreen();
        expect(screen.getByRole('button', { name: 'بحث' })).toBeOnTheScreen();
      } finally {
        resetWindowSize();
      }
    });
  });

  it('has no Downloads card, since there is no downloads route', async () => {
    await renderUi(<MenuScreen />);

    expect(screen.queryByTestId('menu-card-downloads')).toBeNull();
  });
});

describe('MenuScreen columns (ADR 0036)', () => {
  afterEach(() => {
    resetWindowSize();
  });

  it('lays the cards out in two columns on a phone in portrait', async () => {
    setWindowSize(390, 844);
    await renderUi(<MenuScreen />);

    expect(screen.getByTestId('menu-grid-column-1')).toBeOnTheScreen();
    expect(screen.queryByTestId('menu-grid-column-2')).toBeNull();
  });

  it('lays the cards out in three columns on a landscape phone, which is wide', async () => {
    setWindowSize(844, 390);
    await renderUi(<MenuScreen />);

    expect(screen.getByTestId('menu-grid-column-2')).toBeOnTheScreen();
  });
});
