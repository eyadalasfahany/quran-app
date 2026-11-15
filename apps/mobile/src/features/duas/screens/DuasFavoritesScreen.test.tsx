import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { toggleAzkarFavorite } from '@/features/azkar/data';
import { toggleDuaFavorite } from '../data/favorites-repository';
import * as duasHooks from '../data/hooks';
import { DuasFavoritesScreen } from './DuasFavoritesScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('../data/favorites-repository', () => ({
  toggleDuaFavorite: jest.fn(),
}));

// The Azkar favourites store is the one a Hisn dua's bookmark removes from.
jest.mock('@/features/azkar/data', () => ({
  toggleAzkarFavorite: jest.fn(),
}));

jest.mock('../data/hooks', () => ({
  useDuaFavoriteCards: jest.fn(),
}));

const mocked = duasHooks as jest.Mocked<typeof duasHooks>;

const PREVIEW = 'FIXTURE title 1 — not a dua';
const REFERENCE = 'FIXTURE surah ref · 1';
const HISN_PREVIEW = 'FIXTURE text 1 — not a dua';

describe('DuasFavoritesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.useDuaFavoriteCards.mockReturnValue([]);
  });

  it('shows the empty state with a way to browse duas', async () => {
    await renderUi(<DuasFavoritesScreen />);

    expect(screen.getByRole('header', { name: 'المفضلة' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'لا توجد أدعية مفضلة بعد' })).toBeOnTheScreen();
    expect(screen.getByText('احفظ أي دعاء من القوائم لتجده هنا.')).toBeOnTheScreen();

    await press(screen.getByRole('button', { name: 'تصفح الأدعية' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('lists a prophetic dua by its title and a Quranic dua by its reference, numbered', async () => {
    mocked.useDuaFavoriteCards.mockReturnValue([
      { duaKey: 'hadeethenc:1', kind: 'hadith', preview: PREVIEW, quranReference: null },
      { duaKey: 'quran:1:1', kind: 'quran', preview: null, quranReference: REFERENCE },
    ]);
    await renderUi(<DuasFavoritesScreen />);

    expect(screen.getByRole('button', { name: `١, ${PREVIEW}` })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `٢, ${REFERENCE}` })).toBeOnTheScreen();
    expect(screen.getByTestId('dua-favorite-2')).toBeOnTheScreen();
  });

  it('opens a prophetic dua at its hadith detail', async () => {
    mocked.useDuaFavoriteCards.mockReturnValue([{ duaKey: 'hadeethenc:1', kind: 'hadith', preview: PREVIEW, quranReference: null }]);
    await renderUi(<DuasFavoritesScreen />);

    await press(screen.getByRole('button', { name: `١, ${PREVIEW}` }));
    expect(router.push).toHaveBeenLastCalledWith('/duas/hadith/hadeethenc%3A1');
  });

  it('opens a Quranic dua at its quran detail', async () => {
    mocked.useDuaFavoriteCards.mockReturnValue([{ duaKey: 'quran:1:1', kind: 'quran', preview: null, quranReference: REFERENCE }]);
    await renderUi(<DuasFavoritesScreen />);

    await press(screen.getByRole('button', { name: `١, ${REFERENCE}` }));
    expect(router.push).toHaveBeenLastCalledWith('/duas/quran/quran%3A1%3A1');
  });

  it('removes a favourite from its bookmark without opening it', async () => {
    mocked.useDuaFavoriteCards.mockReturnValue([{ duaKey: 'hadeethenc:1', kind: 'hadith', preview: PREVIEW, quranReference: null }]);
    await renderUi(<DuasFavoritesScreen />);

    await press(screen.getByTestId('dua-favorite-remove-1'));
    expect(toggleDuaFavorite).toHaveBeenCalledWith('hadeethenc:1');
    expect(toggleAzkarFavorite).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('lists a saved Hisn dua by its text and reference, numbered in the same list', async () => {
    mocked.useDuaFavoriteCards.mockReturnValue([
      { kind: 'hisn', entryKey: 'FIXTURE:entry-1', preview: HISN_PREVIEW, quranReference: REFERENCE },
      { duaKey: 'hadeethenc:1', kind: 'hadith', preview: PREVIEW, quranReference: null },
    ]);
    await renderUi(<DuasFavoritesScreen />);

    expect(screen.getByRole('button', { name: `١, ${HISN_PREVIEW}, ${REFERENCE}` })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `٢, ${PREVIEW}` })).toBeOnTheScreen();
  });

  it('opens a Hisn dua in its Azkar entry', async () => {
    mocked.useDuaFavoriteCards.mockReturnValue([{ kind: 'hisn', entryKey: 'FIXTURE:entry-1', preview: HISN_PREVIEW, quranReference: null }]);
    await renderUi(<DuasFavoritesScreen />);

    await press(screen.getByRole('button', { name: `١, ${HISN_PREVIEW}` }));
    expect(router.push).toHaveBeenLastCalledWith('/azkar/entry/FIXTURE%3Aentry-1');
  });

  it('removes a Hisn dua by removing its Azkar favourite, not the Duas one', async () => {
    mocked.useDuaFavoriteCards.mockReturnValue([{ kind: 'hisn', entryKey: 'FIXTURE:entry-1', preview: HISN_PREVIEW, quranReference: null }]);
    await renderUi(<DuasFavoritesScreen />);

    await press(screen.getByTestId('dua-favorite-remove-1'));
    expect(toggleAzkarFavorite).toHaveBeenCalledWith('FIXTURE:entry-1');
    expect(toggleDuaFavorite).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('renders the English empty state', async () => {
    await renderUi(<DuasFavoritesScreen />, { locale: 'en' });

    expect(screen.getByRole('header', { name: 'No favourite duas yet' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Browse duas' })).toBeOnTheScreen();
  });
});
