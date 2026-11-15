import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderUi } from '../../../../jest/render-ui';
import * as duasHooks from '../data/hooks';
import type { DuaCategory } from '../data/model';
import { DUAS_HOME_CATEGORY_LIMIT, DuasHomeScreen } from './DuasHomeScreen';

const mockedDuasHooks = duasHooks as jest.Mocked<typeof duasHooks>;

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('../data/hooks', () => ({
  useMyDuas: jest.fn(),
  useDuaCategories: jest.fn(),
}));

// Fixture categories: the Quran category, then HadeethEnc groups with fixture titles. No dua text.
const QURAN: DuaCategory = { id: 'quran', kind: 'quran', titleKey: 'duas.categories.quran', title: null, count: 28, sourceKind: 'duas' };

function group(index: number): DuaCategory {
  return {
    id: `hadeethenc:${index}`,
    kind: 'hadeethenc',
    titleKey: null,
    title: `FIXTURE group ${index}`,
    count: index,
    sourceKind: 'duas',
  };
}

/** Ten categories: more than the eight the home shows first. */
const TEN_CATEGORIES: DuaCategory[] = [QURAN, ...Array.from({ length: 9 }, (_, index) => group(index + 1))];

describe('DuasHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDuasHooks.useMyDuas.mockReturnValue([]);
    mockedDuasHooks.useDuaCategories.mockReturnValue([]);
  });

  it('shows the mine card, the title and the favourites button', async () => {
    await renderUi(<DuasHomeScreen />);

    expect(screen.getByTestId('duas-mine-card')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'الأدعية' })).toBeOnTheScreen();
    expect(screen.getByTestId('duas-home-favorites')).toBeOnTheScreen();
  });

  it('shows no search button, until the search frame is approved', async () => {
    await renderUi(<DuasHomeScreen />);

    expect(screen.queryByRole('button', { name: 'بحث' })).toBeNull();
  });

  it('shows the sources line under the blocks', async () => {
    await renderUi(<DuasHomeScreen />);

    expect(screen.getByTestId('duas-source-credit')).toHaveTextContent(
      'المصادر: القرآن الكريم · حصن المسلم · موسوعة الأحاديث النبوية (HadeethEnc.com)',
    );
  });

  it('hides the categories heading and grid when there are no categories', async () => {
    await renderUi(<DuasHomeScreen />);

    expect(screen.queryByTestId('duas-categories-heading')).toBeNull();
    expect(screen.queryByTestId('duas-categories-toggle')).toBeNull();
    expect(screen.queryByRole('button', { name: /عرض/ })).toBeNull();
  });

  it('shows the categories heading and one tile per category, with the count and source', async () => {
    mockedDuasHooks.useDuaCategories.mockReturnValue([QURAN, group(1)]);
    await renderUi(<DuasHomeScreen />);

    expect(screen.getByTestId('duas-categories-heading')).toHaveTextContent('التصنيفات');
    expect(screen.getByRole('button', { name: 'من القرآن الكريم، ٢٨ دعاءً · القرآن' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'FIXTURE group 1، دعاء واحد · HadeethEnc' })).toBeOnTheScreen();
  });

  it('shows the first eight categories and an expand link for the total', async () => {
    mockedDuasHooks.useDuaCategories.mockReturnValue(TEN_CATEGORIES);
    await renderUi(<DuasHomeScreen />);

    expect(screen.getByTestId(`duas-categories-tile-${TEN_CATEGORIES[DUAS_HOME_CATEGORY_LIMIT - 1]!.id}`)).toBeOnTheScreen();
    expect(screen.queryByTestId(`duas-categories-tile-${TEN_CATEGORIES[DUAS_HOME_CATEGORY_LIMIT]!.id}`)).toBeNull();
    expect(screen.getByRole('button', { name: 'عرض الكل ١٠' }).props.accessibilityState).toMatchObject({ expanded: false });
  });

  it('expands the grid in place on «عرض الكل», then collapses on «عرض أقل»', async () => {
    mockedDuasHooks.useDuaCategories.mockReturnValue(TEN_CATEGORIES);
    await renderUi(<DuasHomeScreen />);

    await fireEvent.press(screen.getByTestId('duas-categories-toggle'));
    expect(screen.getByTestId(`duas-categories-tile-${TEN_CATEGORIES[9]!.id}`)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'عرض أقل' }).props.accessibilityState).toMatchObject({ expanded: true });

    await fireEvent.press(screen.getByTestId('duas-categories-toggle'));
    expect(screen.queryByTestId(`duas-categories-tile-${TEN_CATEGORIES[9]!.id}`)).toBeNull();
    expect(screen.getByRole('button', { name: 'عرض الكل ١٠' })).toBeOnTheScreen();
  });

  it('shows no expand link when all categories fit in the first eight', async () => {
    mockedDuasHooks.useDuaCategories.mockReturnValue(TEN_CATEGORIES.slice(0, DUAS_HOME_CATEGORY_LIMIT));
    await renderUi(<DuasHomeScreen />);

    expect(screen.queryByRole('button', { name: /عرض/ })).toBeNull();
  });

  it('opens a category on its tile press', async () => {
    mockedDuasHooks.useDuaCategories.mockReturnValue([QURAN]);
    await renderUi(<DuasHomeScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'من القرآن الكريم، ٢٨ دعاءً · القرآن' }));
    expect(router.push).toHaveBeenCalledWith('/duas/category/quran');
  });

  it('opens favourites from its button and the mine card from its card', async () => {
    await renderUi(<DuasHomeScreen />);

    await fireEvent.press(screen.getByTestId('duas-home-favorites'));
    expect(router.push).toHaveBeenLastCalledWith('/duas/favorites');

    await fireEvent.press(screen.getByTestId('duas-mine-card'));
    expect(router.push).toHaveBeenLastCalledWith('/duas/mine');
  });

  it('renders the category names and the expand link in English', async () => {
    mockedDuasHooks.useDuaCategories.mockReturnValue(TEN_CATEGORIES);
    await renderUi(<DuasHomeScreen />, { locale: 'en' });

    expect(screen.getByTestId('duas-categories-toggle')).toHaveTextContent('Show all 10');
    expect(screen.getByRole('button', { name: 'From the Quran, 28 duas · Quran' })).toBeOnTheScreen();
    expect(screen.getByTestId('duas-categories-heading')).toHaveTextContent('Categories');
  });
});
