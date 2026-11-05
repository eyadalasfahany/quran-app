import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import * as duasHooks from '../data/hooks';
import * as contentRepository from '../data/content-repository';
import { DuaQuranListScreen } from './DuaQuranListScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('../data/hooks', () => ({
  useQuranicDuasList: jest.fn(),
}));

jest.mock('../data/content-repository', () => ({
  getQuranicDuaVerses: jest.fn(() => []),
}));

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => ({
    executor: {},
  }),
}));

jest.mock('@/features/reader/data/chapters', () => ({
  getChapter: (_executor: unknown, surah: number) =>
    surah === 1
      ? { nameArabic: 'FIXTURE surah ar', nameSimple: 'FIXTURE surah en' }
      : surah === 2
        ? { nameArabic: 'FIXTURE surah 2 ar', nameSimple: 'FIXTURE surah 2 en' }
        : undefined,
}));

const mocked = duasHooks as jest.Mocked<typeof duasHooks>;
const verses = contentRepository as jest.Mocked<typeof contentRepository>;

const VERSE_1 = 'FIXTURE VERSE 1:1 — not a dua';
const VERSE_2 = 'FIXTURE VERSE 2:255 — not a dua';
const VERSE_3 = 'FIXTURE VERSE 2:256 — not a dua';

const ONE = { duaKey: 'quran:1:1', position: 1, surah: 1, verseFrom: 1, verseTo: null };
const SPAN = { duaKey: 'quran:2:255', position: 2, surah: 2, verseFrom: 255, verseTo: 256 };

describe('DuaQuranListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.useQuranicDuasList.mockReturnValue([]);
    verses.getQuranicDuaVerses.mockReturnValue([]);
  });

  it('shows the empty state with no rows', async () => {
    await renderUi(<DuaQuranListScreen />);
    expect(screen.getByTestId('dua-quran-list-empty')).toBeOnTheScreen();
  });

  it('groups rows by surah with section titles', async () => {
    mocked.useQuranicDuasList.mockReturnValue([ONE, SPAN]);
    verses.getQuranicDuaVerses.mockImplementation((_db, dua) => (dua.surah === 1 ? [{ textUthmani: VERSE_1 }] as never : [{ textUthmani: VERSE_2 }, { textUthmani: VERSE_3 }] as never));
    await renderUi(<DuaQuranListScreen />);
    expect(screen.getByTestId('dua-quran-surah-1')).toBeOnTheScreen();
    expect(screen.getByTestId('dua-quran-surah-2')).toBeOnTheScreen();
    expect(screen.getByTestId('dua-quran-row-quran:1:1')).toBeOnTheScreen();
    expect(screen.getByTestId('dua-quran-row-quran:2:255')).toBeOnTheScreen();
  });

  it('shows the full verse text of each row, joined with one space', async () => {
    mocked.useQuranicDuasList.mockReturnValue([SPAN]);
    verses.getQuranicDuaVerses.mockReturnValue([{ textUthmani: VERSE_2 }, { textUthmani: VERSE_3 }] as never);
    await renderUi(<DuaQuranListScreen />);
    expect(screen.getByText(`${VERSE_2} ${VERSE_3}`)).toBeOnTheScreen();
  });

  it('names each row by its surah and ayah label, not by the verse', async () => {
    mocked.useQuranicDuasList.mockReturnValue([ONE]);
    verses.getQuranicDuaVerses.mockReturnValue([{ textUthmani: VERSE_1 }] as never);
    await renderUi(<DuaQuranListScreen />);
    expect(screen.getByRole('button', { name: 'FIXTURE surah ar، الآية ١' })).toBeOnTheScreen();
  });

  it('omits a dua whose verses are missing, and a surah left with no rows', async () => {
    mocked.useQuranicDuasList.mockReturnValue([ONE, SPAN]);
    verses.getQuranicDuaVerses.mockImplementation((_db, dua) => (dua.surah === 1 ? [] : [{ textUthmani: VERSE_2 }] as never));
    await renderUi(<DuaQuranListScreen />);
    expect(screen.queryByTestId('dua-quran-row-quran:1:1')).toBeNull();
    expect(screen.queryByTestId('dua-quran-surah-1')).toBeNull();
    expect(screen.getByTestId('dua-quran-row-quran:2:255')).toBeOnTheScreen();
  });

  it('opens the dua detail when a row is pressed', async () => {
    mocked.useQuranicDuasList.mockReturnValue([ONE]);
    verses.getQuranicDuaVerses.mockReturnValue([{ textUthmani: VERSE_1 }] as never);
    await renderUi(<DuaQuranListScreen />);
    await press(screen.getByRole('button', { name: 'FIXTURE surah ar، الآية ١' }));
    expect(router.push).toHaveBeenCalledWith('/duas/quran/quran%3A1%3A1');
  });
});
