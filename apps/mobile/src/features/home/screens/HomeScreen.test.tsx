import { router } from 'expo-router';
import { fireEvent } from '@testing-library/react-native';

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
  router: { push: jest.fn() },
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

describe('HomeScreen', () => {
  beforeEach(() => {
    storage.remove(storageKeys.readerLastVerseKey);
    jest.mocked(router.push).mockClear();
    jest.mocked(openContentDb).mockImplementation(() => {
      throw new Error('openContentDb is unavailable under Jest.');
    });
    jest.mocked(getVerseByKey).mockReset();
    jest.mocked(getChapter).mockReset();
  });

  it('renders the home title without a continue row when the content database is closed', async () => {
    const view = await renderUi(<HomeScreen />);

    expect(view.getByTestId('screen-home')).toBeOnTheScreen();
    expect(view.getByText('الرئيسية')).toBeOnTheScreen();
    expect(view.queryByTestId('home-continue-reading')).toBeNull();
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
});
