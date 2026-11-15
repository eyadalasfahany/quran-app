import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { readDuasRecentSearches, addDuasRecentSearch, clearDuasRecentSearches } from '../data/recent-searches';
import * as duasHooks from '../data/hooks';
import type { DuaCategory } from '../data/model';
import type { DuaSearchResult } from '../data/search';
import { DuasSearchScreen } from './DuasSearchScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

// The search hook is the data layer's; the debounce is removed so each keystroke shows its results.
jest.mock('@/features/search/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: unknown) => value,
}));

jest.mock('../data/hooks', () => ({
  useDuaSearch: jest.fn(),
  useDuaCategories: jest.fn(),
}));

// The quran reference is formatted by the azkar hook; a fixed label keeps the screen's text predictable.
jest.mock('@/features/azkar/data', () => ({
  useQuranReferenceLabel: () => (ref: { surah: number; verseFrom: number; verseTo: number } | null) =>
    ref === null ? null : `FIXTURE ref ${ref.surah}:${ref.verseFrom}-${ref.verseTo}`,
}));

const mocked = duasHooks as jest.Mocked<typeof duasHooks>;

const HISN_CATEGORY: DuaCategory = { id: 'hisn:browse-a', kind: 'hisn', titleKey: null, title: 'FIXTURE topic alpha', count: 2, sourceKind: 'azkar' };

const CATEGORIES: DuaCategory[] = [
  { id: 'quran', kind: 'quran', titleKey: 'duas.categories.quran', title: null, count: 1, sourceKind: 'duas' },
  { id: 'hadeethenc:1', kind: 'hadeethenc', titleKey: null, title: 'FIXTURE group one', count: 1, sourceKind: 'duas' },
  HISN_CATEGORY,
];

const HADITH_PREVIEW = 'نص تجريبي ١ — إلى ليس دعاءً';

const RESULT: DuaSearchResult = {
  categories: [{ category: HISN_CATEGORY, label: 'FIXTURE topic alpha', highlight: { start: 8, end: 13 } }],
  duas: [
    { kind: 'quran', key: 'quran:quran:1:1', duaKey: 'quran:1:1', categoryId: 'quran', surah: 1, verseFrom: 1, verseTo: 1 },
    {
      kind: 'hadith',
      key: 'hadith:hadeethenc:1',
      duaKey: 'hadeethenc:1',
      categoryId: 'hadeethenc:1',
      preview: HADITH_PREVIEW,
      highlight: { start: 3, end: 9 },
    },
    {
      kind: 'hisn',
      key: 'hisn:FIXTURE:entry-1',
      entryKey: 'FIXTURE:entry-1',
      categoryId: 'hisn:browse-a',
      preview: 'FIXTURE text 1 — not a dua',
      highlight: null,
    },
  ],
};

async function type(text: string) {
  await act(async () => {
    fireEvent.changeText(screen.getByTestId('duas-search-bar-field-input'), text);
  });
}

describe('DuasSearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearDuasRecentSearches();
    mocked.useDuaCategories.mockReturnValue(CATEGORIES);
    mocked.useDuaSearch.mockReturnValue({ categories: [], duas: [] });
  });

  it('shows the hint and the recent searches when the query is empty', async () => {
    addDuasRecentSearch('السفر');
    await renderUi(<DuasSearchScreen />);

    expect(screen.getByText('ابحث بالكلمة أو بجزء منها، وستظهر التصنيفات والأدعية التي تطابقها.')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'عمليات البحث الأخيرة' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'السفر' })).toBeOnTheScreen();
  });

  it('lists the matching category first, with its count, and opens it', async () => {
    mocked.useDuaSearch.mockReturnValue(RESULT);
    await renderUi(<DuasSearchScreen />);
    await type('topic');

    expect(await screen.findByRole('header', { name: 'التصنيفات' })).toBeOnTheScreen();
    await press(screen.getByRole('button', { name: 'FIXTURE topic alpha، دعاءان' }));
    expect(router.push).toHaveBeenLastCalledWith('/duas/category/hisn%3Abrowse-a');
    expect(readDuasRecentSearches()).toEqual(['topic']);
  });

  it('lists the matching duas under «الأدعية», each with its category as caption', async () => {
    mocked.useDuaSearch.mockReturnValue(RESULT);
    await renderUi(<DuasSearchScreen />);
    await type('تجريبي');

    expect(await screen.findByRole('header', { name: 'الأدعية' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '١، FIXTURE ref 1:1-1، من القرآن الكريم' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `٢، ${HADITH_PREVIEW}، FIXTURE group one` })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '٣، FIXTURE text 1 — not a dua، FIXTURE topic alpha' })).toBeOnTheScreen();
    expect(screen.getByTestId('duas-search-result-2-caption')).toHaveTextContent('FIXTURE group one');
  });

  it('highlights the matched text of a HadeethEnc dua inside its own run', async () => {
    mocked.useDuaSearch.mockReturnValue(RESULT);
    await renderUi(<DuasSearchScreen />);
    await type('تجريبي');

    expect(await screen.findByText('تجريبي')).toBeOnTheScreen();
  });

  it('opens a Quranic dua at its detail, a HadeethEnc dua at its detail, and a Hisn dua in Azkar', async () => {
    mocked.useDuaSearch.mockReturnValue(RESULT);
    await renderUi(<DuasSearchScreen />);
    await type('x');

    await press(await screen.findByRole('button', { name: '١، FIXTURE ref 1:1-1، من القرآن الكريم' }));
    expect(router.push).toHaveBeenLastCalledWith('/duas/quran/quran%3A1%3A1');

    await press(screen.getByRole('button', { name: `٢، ${HADITH_PREVIEW}، FIXTURE group one` }));
    expect(router.push).toHaveBeenLastCalledWith('/duas/hadith/hadeethenc%3A1');

    await press(screen.getByRole('button', { name: '٣، FIXTURE text 1 — not a dua، FIXTURE topic alpha' }));
    expect(router.push).toHaveBeenLastCalledWith('/azkar/entry/FIXTURE%3Aentry-1');
  });

  it('says so when a query matches nothing', async () => {
    await renderUi(<DuasSearchScreen />);
    await type('لا شيء');

    expect(await screen.findByText('لا توجد نتائج مطابقة')).toBeOnTheScreen();
  });

  it('runs a recent search when its row is pressed', async () => {
    addDuasRecentSearch('السفر');
    await renderUi(<DuasSearchScreen />);

    await press(screen.getByRole('button', { name: 'السفر' }));
    expect(screen.getByTestId('duas-search-bar-field-input').props.value).toBe('السفر');
  });

  it('renders the English placeholder and labels', async () => {
    addDuasRecentSearch('travel');
    await renderUi(<DuasSearchScreen />, { locale: 'en' });

    expect(screen.getByLabelText('Search duas')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Clear history' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/duas/screens/DuasSearchScreen.tsx')).toEqual([]);
  });
});
