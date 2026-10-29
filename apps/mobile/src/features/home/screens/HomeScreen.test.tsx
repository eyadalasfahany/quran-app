import { router } from 'expo-router';
import { fireEvent } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { openContentDb } from '@/core/db/content/open';
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

jest.mock('@/core/db/content/open', () => ({
  openContentDb: jest.fn(() => {
    throw new Error('openContentDb is unavailable under Jest.');
  }),
  useContentDb: () => ({ error: null, ready: true }),
}));

jest.mock('@/features/reader/data/verses', () => ({
  getVerseByKey: jest.fn(),
}));

jest.mock('@/features/reader/data/chapters', () => ({
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

  it('renders the Surahs and Saved tiles without a last-read verse', async () => {
    const view = await renderUi(<HomeScreen />);

    expect(view.getByTestId('home-tiles-surahs')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'السور' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'المحفوظات' })).toBeOnTheScreen();
    expect(view.queryByRole('button', { name: 'الحديث' })).toBeNull();
    expect(view.queryByRole('button', { name: 'القرّاء' })).toBeNull();
  });

  it('navigates to the Mushaf and My Quran tabs from the tiles', async () => {
    const view = await renderUi(<HomeScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'السور' }));
    expect(router.navigate).toHaveBeenLastCalledWith('/(main)/(mushaf)');

    await fireEvent.press(view.getByRole('button', { name: 'المحفوظات' }));
    expect(router.navigate).toHaveBeenLastCalledWith('/(main)/(my-quran)');
    expect(router.navigate).toHaveBeenCalledTimes(2);
  });
});
