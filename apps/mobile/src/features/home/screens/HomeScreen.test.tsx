import { router } from 'expo-router';
import { act, fireEvent, within } from '@testing-library/react-native';
import { Dimensions, Platform } from 'react-native';

import { tabContentClearance } from '@/core/layout/tab-bar-clearance';
import { MINI_PLAYER_TABS_FOOTPRINT } from '@/features/audio/mini-player-metrics';

import { openContentDb } from '@/core/db/content/open';
import { toLocalDateString } from '@/features/khatma/data';
import { resolvePlanBounds } from '@/features/khatma/plan-bounds';
import { listReciters, type CatalogReciter } from '@/features/audio/data/reciters';
import { useRecentListens } from '@/features/audio/data/recent-listens-hooks';
import type { RecentListen } from '@/features/audio/data/recent-listens';
import { pause } from '@/features/audio/player';
import { usePlayerStore } from '@/features/audio/playerStore';
import { playRecentListen } from '@/features/audio/reciter-playback';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { getChapter, type ChapterRecord } from '@/features/reader/data/chapters';
import { getVerseByKey, type VerseRecord } from '@/features/reader/data/verses';

import { renderUi } from '../../../../jest/render-ui';
import { HomeScreen } from './HomeScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), push: jest.fn() },
}));

// An active Khatma plan is off by default; the wird tests turn it on.
const mockPlan: { plan: unknown } = { plan: null };
jest.mock('@/features/khatma/data', () => ({
  ...jest.requireActual<typeof import('@/features/khatma/data')>('@/features/khatma/data'),
  useActivePlan: () => ({ data: mockPlan.plan ? [mockPlan.plan] : [] }),
  usePlanLogs: () => ({ data: [] }),
}));

jest.mock('@/features/khatma/plan-bounds', () => ({
  resolvePlanBounds: jest.fn(() => null),
}));

// Flipped to false to show the content database still opening.
const mockContentDb: { ready: boolean } = { ready: true };
jest.mock('@/core/db/content/open', () => ({
  openContentDb: jest.fn(() => {
    throw new Error('openContentDb is unavailable under Jest.');
  }),
  useContentDb: () => ({ error: null, ready: mockContentDb.ready }),
}));

jest.mock('@/core/sync/useStaleContent', () => ({
  useStaleContent: jest.fn(() => false),
}));

jest.mock('@/features/reader/data/verses', () => ({
  getVerseByKey: jest.fn(),
}));

jest.mock('@/features/audio/data/recent-listens-hooks', () => ({
  useRecentListens: jest.fn(() => ({ data: [] })),
}));

jest.mock('@/features/audio/data/reciters', () => ({
  listReciters: jest.fn(() => []),
}));

jest.mock('@/features/audio/player', () => ({
  ...jest.requireActual<typeof import('@/features/audio/player')>('@/features/audio/player'),
  pause: jest.fn(),
}));

jest.mock('@/features/audio/reciter-playback', () => ({
  playRecentListen: jest.fn(() => Promise.resolve()),
}));

// Azkar content availability (ADR 0017): off by default, so every Azkar block is hidden unless a test turns it on.
const mockAzkar: { available: boolean; continueAzkar: unknown; recent: unknown[]; sessions: unknown[] } = {
  available: false,
  continueAzkar: null,
  recent: [],
  sessions: [],
};
jest.mock('@/features/azkar/data', () => ({
  useAzkarAvailable: () => mockAzkar.available,
  useContinueAzkar: () => mockAzkar.continueAzkar,
  useRecentAzkarItems: () => mockAzkar.recent,
  useSessionCategoryProgress: () => mockAzkar.sessions,
}));

// No prayer location by default, so the next-prayer card asks for one. Only the location is mocked; the rest is real.
const mockLocation: { coords: { lat: number; lng: number } | null } = { coords: null };
jest.mock('@/features/salah/hooks', () => ({
  ...jest.requireActual<typeof import('@/features/salah/hooks')>('@/features/salah/hooks'),
  usePrayerLocation: () => ({ coords: mockLocation.coords, permissionStatus: 'granted', refresh: jest.fn(), source: 'auto' }),
}));

jest.mock('@/features/reader/data/chapters', () => ({
  ...jest.requireActual('@/features/reader/data/chapters'),
  getChapter: jest.fn(),
}));

const chapter: ChapterRecord = {
  bismillahImlaei: null,
  bismillahPre: 1,
  bismillahText: null,
  id: 2,
  nameArabic: 'البقرة',
  nameEn: 'The Cow',
  nameSimple: 'Al-Baqarah',
  pageEnd: 49,
  pageStart: 2,
  revelationOrder: 87,
  revelationPlace: 'madinah',
  versesCount: 286,
};

const verse: VerseRecord = {
  chapterId: 2,
  hizb: 1,
  id: 262,
  juz: 3,
  page: 42,
  rubElHizb: 1,
  sajdah: 'none',
  textImlaei: null,
  textIndopak: null,
  textSearch: '',
  textUthmani: 'ٱللَّهُ',
  textUthmaniTajweed: null,
  verseKey: '2:255',
  verseNumber: 255,
};

function setWindowWidth(width: number) {
  Dimensions.set({
    screen: { fontScale: 1, height: 844, scale: 1, width },
    window: { fontScale: 1, height: 844, scale: 1, width },
  });
}

describe('HomeScreen', () => {
  beforeEach(() => {
    setWindowWidth(390);
    storage.remove(storageKeys.readerLastVerseKey);
    jest.mocked(router.push).mockClear();
    jest.mocked(router.navigate).mockClear();
    jest.mocked(openContentDb).mockImplementation(() => {
      throw new Error('openContentDb is unavailable under Jest.');
    });
    jest.mocked(getVerseByKey).mockReset();
    jest.mocked(getChapter).mockReset();
  });

  it('renders the greeting title and the search button without a continue row when the content database is closed', async () => {
    const view = await renderUi(<HomeScreen />);

    expect(view.getByTestId('screen-home')).toBeOnTheScreen();
    expect(view.getByRole('header', { name: 'السلام عليكم' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'بحث' })).toBeOnTheScreen();
    expect(view.queryByTestId('home-continue-reading')).toBeNull();
  });

  it('shows the continue skeleton and the recent listens heading with two row skeletons while the content database opens', async () => {
    mockContentDb.ready = false;
    try {
      const view = await renderUi(<HomeScreen />);

      const card = view.getByTestId('home-continue-loading');
      expect(card.props.accessibilityLabel).toBe('جارٍ التحميل');
      expect(card.props.accessibilityState).toEqual({ busy: true });
      expect(view.queryByTestId('home-continue-reading')).toBeNull();
      expect(view.getByRole('header', { name: 'آخر ما استمعت إليه' })).toBeOnTheScreen();
      expect(view.getByTestId('home-recent-listens-loading').props.accessibilityState).toEqual({ busy: true });
    } finally {
      mockContentDb.ready = true;
    }
  });

  it('keeps the header search button on compact windows', async () => {
    const view = await renderUi(<HomeScreen />);

    expect(view.getByTestId('home-search')).toBeOnTheScreen();
  });

  it('drops the header search button on expanded windows, where the sidebar holds search', async () => {
    setWindowWidth(900);
    const view = await renderUi(<HomeScreen />);

    expect(view.queryByTestId('home-search')).toBeNull();
    expect(view.queryByRole('button', { name: 'بحث' })).toBeNull();
    expect(view.getByRole('header', { name: 'السلام عليكم' })).toBeOnTheScreen();
  });

  it('opens the search screen from the header button', async () => {
    const view = await renderUi(<HomeScreen />);
    await fireEvent.press(view.getByRole('button', { name: 'بحث' }));

    expect(router.push).toHaveBeenCalledWith('/search');
  });

  it('opens the saved ayah from the continue row', async () => {
    storage.set(storageKeys.readerLastVerseKey, '2:255');
    jest.mocked(openContentDb).mockReturnValue({ executor: {} } as ReturnType<typeof openContentDb>);
    jest.mocked(getVerseByKey).mockReturnValue(verse);
    jest.mocked(getChapter).mockReturnValue(chapter);

    const view = await renderUi(<HomeScreen />);
    await fireEvent.press(view.getByTestId('home-continue-reading'));

    expect(router.push).toHaveBeenCalledWith('/read/2:255');
  });

  it("names the continue row's surah by its transliteration in English, and in Arabic in Arabic", async () => {
    storage.set(storageKeys.readerLastVerseKey, '2:255');
    jest.mocked(openContentDb).mockReturnValue({ executor: {} } as ReturnType<typeof openContentDb>);
    jest.mocked(getVerseByKey).mockReturnValue(verse);
    jest.mocked(getChapter).mockReturnValue(chapter);

    const english = await renderUi(<HomeScreen />, { locale: 'en' });
    expect(english.getByTestId('home-continue-reading')).toHaveTextContent(/Al-Baqarah/);
    expect(english.getByTestId('home-continue-reading')).not.toHaveTextContent(/البقرة/);

    const arabic = await renderUi(<HomeScreen />, { locale: 'ar' });
    expect(arabic.getByTestId('home-continue-reading')).toHaveTextContent(/البقرة/);
    expect(arabic.getByTestId('home-continue-reading')).not.toHaveTextContent(/Al-Baqarah/);
  });

  it('renders the Surahs, Misbaha, Saved and Reciters tiles without Azkar content', async () => {
    mockAzkar.available = false;
    const view = await renderUi(<HomeScreen />);

    expect(view.getByTestId('home-tiles-surahs')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'السور' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'المحفوظات' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'القرّاء' })).toBeOnTheScreen();
    expect(view.queryByRole('button', { name: 'الحديث' })).toBeNull();
    expect(view.queryByRole('button', { name: 'الأذكار' })).toBeNull();
    expect(view.getByRole('button', { name: 'المسبحة' })).toBeOnTheScreen();
    expect(view.getByTestId('home-tiles').children.length).toBe(4);
  });

  it('adds the Azkar and Misbaha tiles in frame order once Azkar content is installed, and opens them', async () => {
    mockAzkar.available = true;
    try {
      const view = await renderUi(<HomeScreen />);

      expect(view.getByTestId('home-tiles').children.length).toBe(5);
      expect(view.getByTestId('home-tiles').children.map((child) => (typeof child === 'string' ? child : child.props.testID))).toEqual([
        'home-tiles-surahs',
        'home-tiles-azkar',
        'home-tiles-sibha',
        'home-tiles-saved',
        'home-tiles-reciters',
      ]);

      await fireEvent.press(view.getByRole('button', { name: 'الأذكار' }));
      expect(router.push).toHaveBeenLastCalledWith('/azkar');

      await fireEvent.press(view.getByRole('button', { name: 'المسبحة' }));
      expect(router.push).toHaveBeenLastCalledWith('/sibha');
    } finally {
      mockAzkar.available = false;
    }
  });

  it('navigates to the Mushaf and My Quran tabs from the tiles', async () => {
    const view = await renderUi(<HomeScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'السور' }));
    expect(router.navigate).toHaveBeenLastCalledWith('/(main)/(mushaf)');

    await fireEvent.press(view.getByRole('button', { name: 'المحفوظات' }));
    expect(router.navigate).toHaveBeenLastCalledWith('/(main)/(my-quran)');

    await fireEvent.press(view.getByRole('button', { name: 'القرّاء' }));
    expect(router.navigate).toHaveBeenLastCalledWith('/(main)/(listen)');
    expect(router.navigate).toHaveBeenCalledTimes(3);
  });
});

describe('HomeScreen recent listens', () => {
  const reciter: CatalogReciter = {
    installed: true,
    isDefault: false,
    hasTimings: true,
    hasWordSegments: false,
    name: 'Husary',
    nameAr: 'الحصري',
    packSizeBytes: 0,
    resourceId: 31,
    style: 'Murattal',
  };
  const listen: RecentListen = { audioFileId: 300, chapterId: 2, lastPositionMs: 4000, playedAt: 2, reciterResourceId: 31 };

  beforeEach(() => {
    setWindowWidth(390);
    jest.mocked(useRecentListens).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useRecentListens>);
    jest.mocked(openContentDb).mockReturnValue({ executor: {} } as ReturnType<typeof openContentDb>);
    jest.mocked(getChapter).mockReturnValue(chapter);
    jest.mocked(listReciters).mockReturnValue([reciter]);
    jest.mocked(playRecentListen).mockClear();
    jest.mocked(pause).mockClear();
    usePlayerStore.getState().reset();
  });

  it('shows pause on a listen that is playing, and pauses from its button', async () => {
    jest.mocked(useRecentListens).mockReturnValue({ data: [listen] } as unknown as ReturnType<typeof useRecentListens>);
    usePlayerStore.setState({ chapterId: 2, reciterId: 31, status: 'playing' });

    const view = await renderUi(<HomeScreen />);
    await fireEvent.press(view.getByRole('button', { name: 'إيقاف مؤقت' }));

    expect(pause).toHaveBeenCalledTimes(1);
    expect(playRecentListen).not.toHaveBeenCalled();
  });

  it('shows the buffering ring and pause on the listen that is starting', async () => {
    jest.mocked(useRecentListens).mockReturnValue({ data: [listen] } as unknown as ReturnType<typeof useRecentListens>);
    usePlayerStore.setState({ startingTarget: { kind: 'listen', resourceId: 31, chapterId: 2 } });

    const view = await renderUi(<HomeScreen />);

    expect(view.getByRole('button', { name: 'إيقاف مؤقت' }).props.accessibilityState).toEqual({ busy: true });
  });

  it('keeps play on a listen when another listen is the one starting', async () => {
    jest.mocked(useRecentListens).mockReturnValue({ data: [listen] } as unknown as ReturnType<typeof useRecentListens>);
    usePlayerStore.setState({ startingTarget: { kind: 'listen', resourceId: 31, chapterId: 3 } });

    const view = await renderUi(<HomeScreen />);

    expect(view.getByRole('button', { name: 'تشغيل سورة البقرة' }).props.accessibilityState).not.toEqual({ busy: true });
  });

  it('keeps play on a listen whose surah is not the one playing', async () => {
    jest.mocked(useRecentListens).mockReturnValue({ data: [listen] } as unknown as ReturnType<typeof useRecentListens>);
    usePlayerStore.setState({ chapterId: 3, reciterId: 31, status: 'playing' });

    const view = await renderUi(<HomeScreen />);

    expect(view.getByRole('button', { name: 'تشغيل سورة البقرة' })).toBeOnTheScreen();
  });

  it('hides the section when there are no recent listens', async () => {
    const view = await renderUi(<HomeScreen />);

    expect(view.queryByTestId('home-recent-listens')).toBeNull();
    expect(view.queryByText('آخر ما استمعت إليه')).toBeNull();
  });

  it('shows the heading and a filled first row with the reciter, surah and style', async () => {
    jest.mocked(useRecentListens).mockReturnValue({ data: [listen] } as unknown as ReturnType<typeof useRecentListens>);

    const view = await renderUi(<HomeScreen />);

    expect(view.getByRole('header', { name: 'آخر ما استمعت إليه' })).toBeOnTheScreen();
    expect(view.getByText('الحصري')).toBeOnTheScreen();
    expect(view.getByText('سورة البقرة · مرتّل')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'تشغيل سورة البقرة' })).toBeOnTheScreen();
  });

  it('resumes the listen with its reciter and saved position when its play button is pressed', async () => {
    jest.mocked(useRecentListens).mockReturnValue({ data: [listen] } as unknown as ReturnType<typeof useRecentListens>);

    const view = await renderUi(<HomeScreen />);
    await fireEvent.press(view.getByRole('button', { name: 'تشغيل سورة البقرة' }));

    expect(playRecentListen).toHaveBeenCalledWith(listen, true);
  });

  it('leaves out a listen whose reciter is not in the catalogue', async () => {
    jest.mocked(useRecentListens).mockReturnValue({ data: [listen] } as unknown as ReturnType<typeof useRecentListens>);
    jest.mocked(listReciters).mockReturnValue([]);

    const view = await renderUi(<HomeScreen />);

    expect(view.queryByTestId('home-recent-listens')).toBeNull();
  });
});

// Home's new sections (ADR 0034): the next prayer, the Azkar blocks, today's progress and the Khatma wird.
function resetHomeMocks() {
  mockAzkar.available = false;
  mockAzkar.continueAzkar = null;
  mockAzkar.recent = [];
  mockAzkar.sessions = [];
  mockLocation.coords = null;
  mockPlan.plan = null;
  storage.remove(storageKeys.dailyGoals);
  storage.remove(storageKeys.azkar.recentScopes);
  storage.remove(storageKeys.sibha.today);
  jest.mocked(router.push).mockClear();
  jest.mocked(openContentDb).mockImplementation(() => {
    throw new Error('openContentDb is unavailable under Jest.');
  });
  jest.mocked(resolvePlanBounds).mockReturnValue(null);
}

const morningSession = { completed: 12, done: false, id: 'morning', title: 'أذكار الصباح', total: 24 };

describe('HomeScreen next prayer', () => {
  beforeEach(() => {
    setWindowWidth(390);
    resetHomeMocks();
  });

  it('asks for a location when none is set, and opens Salah from the card', async () => {
    const view = await renderUi(<HomeScreen />);

    expect(view.getByText('حدّد موقعك لعرض مواقيت الصلاة')).toBeOnTheScreen();
    await fireEvent.press(view.getByRole('button', { name: 'الصلاة القادمة, حدّد موقعك لعرض مواقيت الصلاة' }));

    expect(router.push).toHaveBeenCalledWith('/salah');
  });

  it('shows the next prayer, its time and the time left once a location is set', async () => {
    mockLocation.coords = { lat: 30.0444, lng: 31.2357 };
    const view = await renderUi(<HomeScreen />);

    expect(view.getByTestId('home-next-prayer-name')).toBeOnTheScreen();
    expect(view.getByTestId('home-next-prayer-time')).toBeOnTheScreen();
    expect(view.queryByText('حدّد موقعك لعرض مواقيت الصلاة')).toBeNull();
  });
});

describe('HomeScreen Azkar sections', () => {
  beforeEach(() => {
    setWindowWidth(390);
    resetHomeMocks();
  });

  it('hides every Azkar block without Azkar content', async () => {
    const view = await renderUi(<HomeScreen />);

    expect(view.queryByTestId('home-continue-azkar')).toBeNull();
    expect(view.queryByTestId('home-selected-azkar')).toBeNull();
    expect(view.queryByTestId('home-recent-azkar')).toBeNull();
    expect(view.queryByTestId('home-tiles-azkar')).toBeNull();
    // Misbaha has no religious content, so its tile stays.
    expect(view.getByTestId('home-tiles-sibha')).toBeOnTheScreen();
    expect(view.getByTestId('home-daily-progress-empty')).toBeOnTheScreen();
  });

  it('shows the continue card, the selected sessions and the recent list with Azkar content', async () => {
    mockAzkar.available = true;
    mockAzkar.continueAzkar = {
      completed: 2,
      scope: { categoryId: 'morning', entryKey: null, occasion: null, periodKey: 'p', scopeKey: 'category:morning', total: 3 },
    };
    mockAzkar.sessions = [morningSession];
    mockAzkar.recent = [{ href: '/azkar/read/morning', key: 'category:morning', meta: '١٢ من ٢٤', title: 'أذكار الصباح' }];

    const view = await renderUi(<HomeScreen />);

    expect(view.getByTestId('home-continue-azkar')).toBeOnTheScreen();
    expect(view.getByTestId('home-selected-azkar-morning')).toBeOnTheScreen();
    expect(view.getByTestId('home-recent-azkar-category:morning')).toBeOnTheScreen();
  });

  it('resumes the continue card at its scope, and opens a recent scope where the user left off', async () => {
    mockAzkar.available = true;
    mockAzkar.continueAzkar = {
      completed: 2,
      scope: { categoryId: 'morning', entryKey: null, occasion: null, periodKey: 'p', scopeKey: 'category:morning', total: 3 },
    };
    mockAzkar.recent = [{ href: '/azkar/read/morning', key: 'category:morning', meta: '١٢ من ٢٤', title: 'أذكار الصباح' }];

    const view = await renderUi(<HomeScreen />);
    await fireEvent.press(view.getByRole('button', { name: 'تابع الأذكار, أذكار الصباح, ٢ من ٣' }));
    expect(router.push).toHaveBeenLastCalledWith('/azkar/read/morning');

    await fireEvent.press(view.getByRole('button', { name: 'أذكار الصباح, ١٢ من ٢٤' }));
    expect(router.push).toHaveBeenLastCalledWith('/azkar/read/morning');
  });

  it('opens a session from «أذكار مختارة», and every Azkar from «عرض الكل»', async () => {
    mockAzkar.available = true;
    mockAzkar.sessions = [morningSession];

    const view = await renderUi(<HomeScreen />);
    await fireEvent.press(view.getByRole('button', { name: 'أذكار الصباح, ١٢ من ٢٤' }));
    expect(router.push).toHaveBeenLastCalledWith('/azkar/category/morning');

    await fireEvent.press(view.getByRole('button', { name: 'عرض الكل' }));
    expect(router.push).toHaveBeenLastCalledWith('/azkar');
  });

  it('hides the recent list when nothing has been opened', async () => {
    mockAzkar.available = true;

    const view = await renderUi(<HomeScreen />);

    expect(view.queryByTestId('home-recent-azkar')).toBeNull();
  });
});

describe('HomeScreen daily progress', () => {
  beforeEach(() => {
    setWindowWidth(390);
    resetHomeMocks();
  });

  it('prompts for goals with nothing chosen, and opens the goals sheet from its button', async () => {
    const view = await renderUi(<HomeScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'أهدافي اليومية' }));

    expect(router.push).toHaveBeenCalledWith('/daily-goals');
  });

  it('lists the chosen goals with their counts, and edits them from «تعديل»', async () => {
    mockAzkar.available = true;
    mockAzkar.sessions = [morningSession];
    storage.set(storageKeys.dailyGoals, JSON.stringify({ misbahaTarget: 100, sessions: ['morning'], wird: false }));

    const view = await renderUi(<HomeScreen />);

    expect(within(view.getByTestId('home-daily-progress-session:morning')).getByText('١٢ من ٢٤')).toBeOnTheScreen();
    expect(view.getByTestId('home-daily-progress-misbaha')).toBeOnTheScreen();
    expect(view.queryByTestId('home-daily-progress-empty')).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'تعديل' }));
    expect(router.push).toHaveBeenLastCalledWith('/daily-goals');
  });

  it('shows the misbaha goal from today’s taps with Azkar content', async () => {
    mockAzkar.available = true;
    storage.set(storageKeys.dailyGoals, JSON.stringify({ misbahaTarget: 100, sessions: [], wird: false }));
    storage.set(storageKeys.sibha.today, JSON.stringify({ date: toLocalDateString(new Date()), total: 50 }));

    const view = await renderUi(<HomeScreen />);

    expect(view.getByLabelText('المسبحة, ٥٠ من ١٠٠')).toBeOnTheScreen();
  });

  it('shows the misbaha goal without Azkar content, and no Azkar sessions', async () => {
    storage.set(storageKeys.dailyGoals, JSON.stringify({ misbahaTarget: 100, sessions: ['morning'], wird: false }));
    storage.set(storageKeys.sibha.today, JSON.stringify({ date: toLocalDateString(new Date()), total: 50 }));

    const view = await renderUi(<HomeScreen />);

    expect(view.getByLabelText('المسبحة, ٥٠ من ١٠٠')).toBeOnTheScreen();
    expect(view.queryByTestId('home-daily-progress-session:morning')).toBeNull();
  });
});

describe('HomeScreen Khatma wird', () => {
  beforeEach(() => {
    setWindowWidth(390);
    resetHomeMocks();
  });

  it('shows the wird card, and no wird row, while the wird is not a tracked goal', async () => {
    mockPlan.plan = { durationDays: 30, id: 7, startDate: '2026-10-25', startVerseId: 1 };
    jest.mocked(openContentDb).mockReturnValue({ executor: {} } as ReturnType<typeof openContentDb>);
    jest.mocked(resolvePlanBounds).mockReturnValue({ pagesTotal: 604 } as unknown as ReturnType<typeof resolvePlanBounds>);
    storage.set(storageKeys.dailyGoals, JSON.stringify({ misbahaTarget: null, sessions: [], wird: false }));

    const view = await renderUi(<HomeScreen />);

    expect(view.getByTestId('home-wird-card')).toBeOnTheScreen();
    expect(view.queryByTestId('home-daily-progress-wird')).toBeNull();
  });

  it('shows the wird as the progress row, and no wird card, once the wird is a tracked goal', async () => {
    mockPlan.plan = { durationDays: 30, id: 7, startDate: '2026-10-25', startVerseId: 1 };
    jest.mocked(openContentDb).mockReturnValue({ executor: {} } as ReturnType<typeof openContentDb>);
    jest.mocked(resolvePlanBounds).mockReturnValue({ pagesTotal: 604 } as unknown as ReturnType<typeof resolvePlanBounds>);
    storage.set(storageKeys.dailyGoals, JSON.stringify({ misbahaTarget: null, sessions: [], wird: true }));

    const view = await renderUi(<HomeScreen />);

    expect(view.queryByTestId('home-wird-card')).toBeNull();
    expect(view.getByTestId('home-daily-progress-wird')).toBeOnTheScreen();
  });

  it('hides the wird card and the wird goal without a plan, even when the goal is saved', async () => {
    storage.set(storageKeys.dailyGoals, JSON.stringify({ misbahaTarget: null, sessions: [], wird: true }));

    const view = await renderUi(<HomeScreen />);

    expect(view.queryByTestId('home-wird-card')).toBeNull();
    expect(view.queryByTestId('home-daily-progress-wird')).toBeNull();
    expect(view.getByTestId('home-daily-progress-empty')).toBeOnTheScreen();
  });
});

describe('HomeScreen bottom clearance', () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    setWindowWidth(390);
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'ios' });
  });

  afterEach(async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOs });
    await act(async () => {
      usePlayerStore.getState().reset();
    });
  });

  it('pads the list end by the tab bar footprint plus the page gap while the player is idle', async () => {
    const view = await renderUi(<HomeScreen />);

    expect(view.getByTestId('home-scroll').props.contentContainerStyle.paddingBottom).toBe(
      tabContentClearance('ios', 0) + 16,
    );
  });

  it('adds the mini player footprint to the list end while something plays', async () => {
    await act(async () => {
      usePlayerStore.setState({ chapterId: 2, reciterId: 31, status: 'playing' });
    });
    const view = await renderUi(<HomeScreen />);

    expect(view.getByTestId('home-scroll').props.contentContainerStyle.paddingBottom).toBe(
      tabContentClearance('ios', 0) + MINI_PLAYER_TABS_FOOTPRINT + 16,
    );
  });
});
