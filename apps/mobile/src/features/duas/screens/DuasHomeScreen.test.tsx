import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderUi } from '../../../../jest/render-ui';
import * as duasHooks from '../data/hooks';
import type { DuaCategory } from '../data/model';
import type { DuaTopic } from '../data/topics';
import { DUAS_HOME_CATEGORY_LIMIT, DUAS_HOME_EXPANDED_WIDTH, DuasHomeScreen } from './DuasHomeScreen';

const mockedDuasHooks = duasHooks as jest.Mocked<typeof duasHooks>;
const mockReady = { value: true };
const mockWindowClass = { value: 'compact' as 'compact' | 'medium' | 'expanded' };

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('@/core/db/content/open', () => ({
  openContentDb: jest.fn(() => ({ executor: {} })),
  useContentDb: () => ({ error: null, ready: mockReady.value }),
}));

jest.mock('@/core/layout', () => {
  const actual = jest.requireActual<typeof import('@/core/layout')>('@/core/layout');
  return { ...actual, useWindowClass: () => mockWindowClass.value };
});

jest.mock('../data/hooks', () => ({
  useMyDuas: jest.fn(),
  useDuaCategories: jest.fn(),
  useDuaTopics: jest.fn(),
}));

// Fixture categories and topics: placeholder names only, no dua text. Topic ids are real ids from the shared topic list.
const QURAN: DuaCategory = { id: 'quran', kind: 'quran', titleKey: 'duas.categories.quran', title: null, count: 28, sourceKind: 'duas' };
const BOOK: DuaCategory = {
  id: 'hadithbook:muslim:48',
  kind: 'hadithbook',
  titleKey: null,
  title: 'FIXTURE book',
  count: 3,
  sourceKind: 'hadith',
  bookNumber: '48',
  titleEn: 'FIXTURE book en',
};

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

function topic(id: string, count: number): DuaTopic {
  return { id, count };
}

/** Ten tiles in all: the Quran, a book, and eight HadeethEnc groups. */
const TEN_CATEGORIES: DuaCategory[] = [QURAN, BOOK, ...Array.from({ length: 8 }, (_, index) => group(index + 1))];

/** The tile route ids in tree order, read from the grid's test IDs. */
function tileIds(): string[] {
  return screen
    .getAllByRole('button')
    .map((element) => element.props.testID as string | undefined)
    .filter((id): id is string => id !== undefined && id.startsWith('duas-categories-tile-'))
    .map((id) => id.replace('duas-categories-tile-', ''));
}

describe('DuasHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReady.value = true;
    mockWindowClass.value = 'compact';
    mockedDuasHooks.useMyDuas.mockReturnValue([]);
    mockedDuasHooks.useDuaCategories.mockReturnValue([]);
    mockedDuasHooks.useDuaTopics.mockReturnValue([]);
  });

  it('shows the header with the title, the mine card, search and favourites', async () => {
    mockedDuasHooks.useDuaCategories.mockReturnValue([QURAN]);
    await renderUi(<DuasHomeScreen />);

    expect(screen.getByRole('header', { name: 'الأدعية' })).toBeOnTheScreen();
    expect(screen.getByTestId('duas-mine-card')).toBeOnTheScreen();
    expect(screen.getByTestId('duas-home-search')).toBeOnTheScreen();
    expect(screen.getByTestId('duas-home-favorites')).toBeOnTheScreen();
  });

  it('shows the search button before the favourites button in the header', async () => {
    mockedDuasHooks.useDuaCategories.mockReturnValue([QURAN]);
    await renderUi(<DuasHomeScreen />);

    expect(screen.getByTestId('duas-home-search')).toHaveProp('accessibilityLabel', 'بحث');
    const order = screen.getAllByRole('button').map((button) => button.props.testID);
    expect(order.indexOf('duas-home-search')).toBeLessThan(order.indexOf('duas-home-favorites'));
  });

  it('draws no bell and no downloads control in the header', async () => {
    mockedDuasHooks.useDuaCategories.mockReturnValue([QURAN]);
    await renderUi(<DuasHomeScreen />);

    expect(screen.queryByRole('button', { name: /تذكير|التنزيلات|تنزيل/ })).toBeNull();
  });

  it('opens Duas search from the search button', async () => {
    mockedDuasHooks.useDuaCategories.mockReturnValue([QURAN]);
    await renderUi(<DuasHomeScreen />);

    await fireEvent.press(screen.getByTestId('duas-home-search'));
    expect(router.push).toHaveBeenLastCalledWith('/duas/search');
  });

  it('opens favourites from its button and the mine card from its card', async () => {
    mockedDuasHooks.useDuaCategories.mockReturnValue([QURAN]);
    await renderUi(<DuasHomeScreen />);

    await fireEvent.press(screen.getByTestId('duas-home-favorites'));
    expect(router.push).toHaveBeenLastCalledWith('/duas/favorites');

    await fireEvent.press(screen.getByTestId('duas-mine-card'));
    expect(router.push).toHaveBeenLastCalledWith('/duas/mine');
  });

  describe('loading', () => {
    it('shows the skeleton while the content database opens, with no grid and no mine card', async () => {
      mockReady.value = false;
      mockedDuasHooks.useDuaCategories.mockReturnValue([QURAN]);
      await renderUi(<DuasHomeScreen />);

      expect(screen.getByTestId('duas-home-skeleton')).toBeOnTheScreen();
      expect(screen.queryByTestId('duas-categories')).toBeNull();
      expect(screen.queryByTestId('duas-mine-card')).toBeNull();
    });
  });

  describe('unavailable', () => {
    it('shows the unavailable state with no grid, no mine card and no search or favourites', async () => {
      await renderUi(<DuasHomeScreen />);

      expect(screen.getByRole('header', { name: 'الأدعية غير متاحة بعد' })).toBeOnTheScreen();
      expect(screen.getByText('يتوفر المحتوى عند اكتمال إذن النشر')).toBeOnTheScreen();
      expect(screen.queryByTestId('duas-categories')).toBeNull();
      expect(screen.queryByTestId('duas-mine-card')).toBeNull();
      expect(screen.queryByTestId('duas-home-search')).toBeNull();
      expect(screen.queryByTestId('duas-home-favorites')).toBeNull();
    });

    it('renders the unavailable title and body in English', async () => {
      await renderUi(<DuasHomeScreen />, { locale: 'en' });

      expect(screen.getByRole('header', { name: 'Duas are not available yet' })).toBeOnTheScreen();
      expect(screen.getByText('Content will be available once publishing permission is complete')).toBeOnTheScreen();
    });
  });

  describe('tiles', () => {
    it('shows the categories heading and one Azkar tile per category, with the count only', async () => {
      mockedDuasHooks.useDuaCategories.mockReturnValue([QURAN, group(1)]);
      await renderUi(<DuasHomeScreen />);

      expect(screen.getByTestId('duas-categories-heading')).toHaveTextContent('التصنيفات');
      expect(screen.getByRole('button', { name: 'من القرآن الكريم، ٢٨ دعاءً' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'FIXTURE group 1، دعاء واحد' })).toBeOnTheScreen();
    });

    it('lists the Quranic duas, then the hadith books, the HadeethEnc groups, then the topics', async () => {
      mockedDuasHooks.useDuaCategories.mockReturnValue([group(1), BOOK, QURAN]);
      mockedDuasHooks.useDuaTopics.mockReturnValue([topic('prayer', 2)]);
      await renderUi(<DuasHomeScreen />);

      expect(tileIds()).toEqual(['quran', 'hadithbook:muslim:48', 'hadeethenc:1', 'topic:prayer']);
    });

    it('shows a topic with its name from the Azkar topic list and its count', async () => {
      mockedDuasHooks.useDuaTopics.mockReturnValue([topic('prayer', 2)]);
      await renderUi(<DuasHomeScreen />);

      expect(screen.getByRole('button', { name: 'الصلاة، دعاءان' })).toBeOnTheScreen();
    });

    it('shows the first eight tiles and an expand link for the total', async () => {
      mockedDuasHooks.useDuaCategories.mockReturnValue(TEN_CATEGORIES);
      await renderUi(<DuasHomeScreen />);

      expect(tileIds()).toHaveLength(DUAS_HOME_CATEGORY_LIMIT);
      expect(screen.getByRole('button', { name: 'عرض الكل ١٠' }).props.accessibilityState).toMatchObject({ expanded: false });
    });

    it('expands the grid in place on «عرض الكل», then collapses on «عرض أقل»', async () => {
      mockedDuasHooks.useDuaCategories.mockReturnValue(TEN_CATEGORIES);
      await renderUi(<DuasHomeScreen />);

      await fireEvent.press(screen.getByTestId('duas-categories-toggle'));
      expect(tileIds()).toHaveLength(10);
      expect(screen.getByRole('button', { name: 'عرض أقل' }).props.accessibilityState).toMatchObject({ expanded: true });

      await fireEvent.press(screen.getByTestId('duas-categories-toggle'));
      expect(tileIds()).toHaveLength(DUAS_HOME_CATEGORY_LIMIT);
      expect(screen.getByRole('button', { name: 'عرض الكل ١٠' })).toBeOnTheScreen();
    });

    it('counts the topics in the expand total', async () => {
      mockedDuasHooks.useDuaCategories.mockReturnValue(TEN_CATEGORIES.slice(0, 8));
      mockedDuasHooks.useDuaTopics.mockReturnValue([topic('prayer', 2), topic('fasting', 1), topic('sleep-topic', 3)]);
      await renderUi(<DuasHomeScreen />);

      expect(screen.getByRole('button', { name: 'عرض الكل ١١' })).toBeOnTheScreen();
    });

    it('shows no expand link when all tiles fit in the first eight', async () => {
      mockedDuasHooks.useDuaCategories.mockReturnValue(TEN_CATEGORIES.slice(0, DUAS_HOME_CATEGORY_LIMIT));
      await renderUi(<DuasHomeScreen />);

      expect(screen.queryByTestId('duas-categories-toggle')).toBeNull();
    });

    it('opens a category on its tile press', async () => {
      mockedDuasHooks.useDuaCategories.mockReturnValue([QURAN]);
      await renderUi(<DuasHomeScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'من القرآن الكريم، ٢٨ دعاءً' }));
      expect(router.push).toHaveBeenCalledWith('/duas/category/quran');
    });

    it('opens a topic on its tile press, by its topic route id', async () => {
      mockedDuasHooks.useDuaTopics.mockReturnValue([topic('prayer', 2)]);
      await renderUi(<DuasHomeScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'الصلاة، دعاءان' }));
      expect(router.push).toHaveBeenCalledWith('/duas/category/topic%3Aprayer');
    });

    it('shows the hadith book tile with its fallback name when the book has no Arabic title', async () => {
      mockedDuasHooks.useDuaCategories.mockReturnValue([{ ...BOOK, title: null }]);
      await renderUi(<DuasHomeScreen />);

      expect(screen.getByRole('button', { name: 'كتاب ٤٨، ٣ أدعية' })).toBeOnTheScreen();
    });

    it('shows no source text anywhere on the screen', async () => {
      mockedDuasHooks.useDuaCategories.mockReturnValue(TEN_CATEGORIES);
      await renderUi(<DuasHomeScreen />);

      expect(screen.queryByText(/المصادر|HadeethEnc|حصن المسلم|Hisn|OpenDua/)).toBeNull();
      expect(screen.queryByTestId('duas-source-credit')).toBeNull();
    });

    it('renders the names, the count lines and the expand link in English', async () => {
      mockedDuasHooks.useDuaCategories.mockReturnValue(TEN_CATEGORIES);
      await renderUi(<DuasHomeScreen />, { locale: 'en' });

      expect(screen.getByTestId('duas-categories-toggle')).toHaveTextContent('Show all 10');
      expect(screen.getByRole('button', { name: 'From the Quran, 28 duas' })).toBeOnTheScreen();
      expect(screen.getByTestId('duas-categories-heading')).toHaveTextContent('Categories');
    });
  });

  describe('windows', () => {
    it('keeps the content in the compact column, with no maximum width', async () => {
      await renderUi(<DuasHomeScreen />);

      expect(screen.getByTestId('duas-home-column')).not.toHaveStyle({ maxWidth: DUAS_HOME_EXPANDED_WIDTH });
    });

    it('limits the content to the 640 pt column in the expanded window, and keeps every tile', async () => {
      mockWindowClass.value = 'expanded';
      mockedDuasHooks.useDuaCategories.mockReturnValue(TEN_CATEGORIES.slice(0, 4));
      await renderUi(<DuasHomeScreen />);

      expect(screen.getByTestId('duas-home-column')).toHaveStyle({ maxWidth: DUAS_HOME_EXPANDED_WIDTH });
      expect(tileIds()).toHaveLength(4);
    });
  });
});
