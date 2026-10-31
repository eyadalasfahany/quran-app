import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import * as hooks from '../data/hooks';
import { toggleFavorite } from '../data/favorites-repository';
import { AzkarFavoritesScreen } from './AzkarFavoritesScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('../data/favorites-repository', () => ({
  toggleFavorite: jest.fn(),
}));

jest.mock('../data/hooks', () => ({
  useFavoriteCards: jest.fn(),
}));

const mocked = hooks as jest.Mocked<typeof hooks>;

const PREVIEW = 'نص تجريبي 1 — ليس ذكرًا';

describe('AzkarFavoritesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.useFavoriteCards.mockReturnValue([]);
  });

  it('shows the empty state with a way to browse Azkar', async () => {
    await renderUi(<AzkarFavoritesScreen />);

    expect(screen.getByRole('header', { name: 'المفضلة' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'لا توجد أذكار مفضلة بعد' })).toBeOnTheScreen();
    expect(screen.getByText('اضغط على أيقونة الإشارة في أي ذكر لتجده هنا.')).toBeOnTheScreen();

    await press(screen.getByRole('button', { name: 'تصفّح الأذكار' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('lists the saved dhikr, numbered, and opens one on press', async () => {
    mocked.useFavoriteCards.mockReturnValue([
      { entryKey: 'fixture:entry-001', occasion: 'morning', preview: PREVIEW },
      { entryKey: 'fixture:entry-003', occasion: 'evening', preview: null },
    ]);
    await renderUi(<AzkarFavoritesScreen />);

    expect(screen.getByRole('button', { name: `١, ${PREVIEW}` })).toBeOnTheScreen();
    expect(screen.getByTestId('azkar-favorite-2')).toBeOnTheScreen();

    await press(screen.getByRole('button', { name: `١, ${PREVIEW}` }));
    expect(router.push).toHaveBeenLastCalledWith('/azkar/entry/fixture%3Aentry-001');
  });

  it('removes a favourite from its bookmark without opening it', async () => {
    mocked.useFavoriteCards.mockReturnValue([{ entryKey: 'fixture:entry-001', occasion: 'morning', preview: PREVIEW }]);
    await renderUi(<AzkarFavoritesScreen />);

    await press(screen.getByRole('button', { name: 'إزالة من المفضلة' }));
    expect(toggleFavorite).toHaveBeenCalledWith('fixture:entry-001');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('renders the English empty state', async () => {
    await renderUi(<AzkarFavoritesScreen />, { locale: 'en' });

    expect(screen.getByRole('header', { name: 'No favourite azkar yet' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Browse azkar' })).toBeOnTheScreen();
  });
});
