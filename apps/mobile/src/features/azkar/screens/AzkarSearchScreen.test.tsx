import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import * as hooks from '../data/hooks';
import { addAzkarRecentSearch, clearAzkarRecentSearches, readAzkarRecentSearches } from '../data/recent-searches';
import { AzkarSearchScreen } from './AzkarSearchScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('@/core/db/content/open', () => ({
  openContentDb: jest.fn(() => ({ executor: {} })),
}));

// The search hook is the data layer's; the debounce is removed so each keystroke shows its results.
jest.mock('@/features/search/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: unknown) => value,
}));

jest.mock('../data/hooks', () => ({
  useAzkarCategories: jest.fn(),
  useAzkarSearch: jest.fn(),
}));

const mocked = hooks as jest.Mocked<typeof hooks>;

const PREVIEW = 'نص قريب من النتيجة الصباح ختام';

async function type(text: string) {
  await act(async () => {
    fireEvent.changeText(screen.getByTestId('azkar-search-bar-field-input'), text);
  });
}

describe('AzkarSearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAzkarRecentSearches();
    mocked.useAzkarCategories.mockReturnValue([{ id: 'morning', unitCount: 24 }] as never);
    mocked.useAzkarSearch.mockReturnValue({ entries: [], categoryIds: [] });
  });

  it('shows the hint and the recent searches when the query is empty', async () => {
    addAzkarRecentSearch('الصباح');
    await renderUi(<AzkarSearchScreen />);

    expect(screen.getByText('ابحث بالكلمة أو بجزء منها، وستظهر الأبواب والأذكار التي تطابقها.')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'عمليات البحث الأخيرة' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'الصباح' })).toBeOnTheScreen();
  });

  it('lists matching chapters and highlighted dhikr for a query', async () => {
    mocked.useAzkarSearch.mockReturnValue({
      entries: [{ entryKey: 'fixture:entry-001', preview: PREVIEW, highlight: { start: 16, end: 22 } }],
      categoryIds: ['morning'],
    });
    await renderUi(<AzkarSearchScreen />);

    await type('الصباح');

    expect(await screen.findByRole('header', { name: 'الأبواب' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'أذكار الصباح, ٢٤ ذكرًا' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'الأذكار' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `١, ${PREVIEW}` })).toBeOnTheScreen();
  });

  it('opens a matching entry and records the query', async () => {
    mocked.useAzkarSearch.mockReturnValue({
      entries: [{ entryKey: 'fixture:entry-001', preview: PREVIEW, highlight: null }],
      categoryIds: [],
    });
    await renderUi(<AzkarSearchScreen />);
    await type('الصباح');

    await press(await screen.findByRole('button', { name: `١, ${PREVIEW}` }));
    expect(router.push).toHaveBeenLastCalledWith('/azkar/entry/fixture%3Aentry-001');
    expect(readAzkarRecentSearches()).toEqual(['الصباح']);
  });

  it('says so when a query matches nothing', async () => {
    await renderUi(<AzkarSearchScreen />);
    await type('لا شيء');

    expect(await screen.findByText('لا توجد نتائج مطابقة')).toBeOnTheScreen();
  });

  it('runs a recent search when its row is pressed', async () => {
    addAzkarRecentSearch('المساء');
    await renderUi(<AzkarSearchScreen />);

    await press(screen.getByRole('button', { name: 'المساء' }));
    expect(screen.getByTestId('azkar-search-bar-field-input').props.value).toBe('المساء');
  });

  it('renders the English placeholder', async () => {
    await renderUi(<AzkarSearchScreen />, { locale: 'en' });
    expect(screen.getByLabelText('Search azkar')).toBeOnTheScreen();
  });
});
