import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { DatabaseSync } from 'node:sqlite';

import { useContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { locales, flatStyle, renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { FIXTURE_MULTI, FIXTURE_SINGLE, loadHadithDevFixtures } from '../data/__fixtures__/dev-fixtures';
import { themes } from '@/core/theme';

import { useDebouncedValue } from '@/features/search/hooks/useDebouncedValue';

import { HadithSearchScreen } from './HadithSearchScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

let mockOpen: () => { executor: SqlExecutor } = () => {
  throw new Error('The content database is not open.');
};

// The screen debounces the query at 150 ms (the Quran search hook). Here the debounce is a pass-through so results appear
// in the same act as the typing; the screen's call with 150 ms is asserted separately.
jest.mock('@/features/search/hooks/useDebouncedValue', () => ({
  useDebouncedValue: jest.fn(<T,>(value: T) => value),
}));

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => mockOpen(),
  useContentDb: jest.fn(() => ({ ready: true, error: null })),
}));

const FIELD = 'ابحث في الحديث';
const RESULTS = 'hadith-search-results';

function field() {
  return screen.getByPlaceholderText(FIELD);
}

/** Types into the field inside an awaited act, so the state update and its render are flushed. */
async function typeQuery(text: string) {
  await act(async () => {
    fireEvent.changeText(field(), text);
  });
}

/** Submits the field (the keyboard's search key) inside an awaited act. */
async function submitQuery(text: string) {
  await typeQuery(text);
  await act(async () => {
    fireEvent(field(), 'submitEditing');
  });
}

describe('HadithSearchScreen', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    storage.remove(storageKeys.hadith.searchRecent);
    storage.remove(storageKeys.searchRecentQueries);
    storage.remove(storageKeys.azkar.searchRecent);
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    mockOpen = () => ({ executor });
    loadHadithDevFixtures(executor);
    jest.mocked(useContentDb).mockReturnValue({ ready: true, error: null });
  });

  afterEach(() => {
    database.close();
  });

  it.each(locales)('renders the search field and cancel in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithSearchScreen />, { locale });
    expect(screen.getByTestId('screen-hadith-search')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText(locale === 'ar' ? FIELD : 'Search hadith')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'إلغاء' : 'Cancel' })).toBeOnTheScreen();
  });

  it('debounces the query at 150 ms', async () => {
    await renderUi(<HadithSearchScreen />);
    expect(useDebouncedValue).toHaveBeenCalledWith('', 150);
  });

  it('cancel goes back', async () => {
    await renderUi(<HadithSearchScreen />);
    await press(screen.getByRole('button', { name: 'إلغاء' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('shows the hint and no results before typing', async () => {
    await renderUi(<HadithSearchScreen />);
    expect(screen.getByTestId('hadith-search-hint')).toBeOnTheScreen();
    expect(screen.queryByTestId('hadith-state-view')).toBeNull();
  });

  it('shows recent searches before typing and fills the field when one is tapped', async () => {
    storage.set(storageKeys.hadith.searchRecent, JSON.stringify(['تجريبي']));
    await renderUi(<HadithSearchScreen />);
    await press(screen.getByRole('button', { name: 'تجريبي' }));
    expect(field().props.value).toBe('تجريبي');
    expect(screen.getByTestId(`${RESULTS}-item--1-5`)).toBeOnTheScreen();
  });

  it('typing a diacritic or alef variant finds the same hadith as the plain word', async () => {
    await renderUi(<HadithSearchScreen />);
    await typeQuery('حَدِيثًا');
    expect(screen.getByTestId(`${RESULTS}-item--1-5`)).toBeOnTheScreen();
    await typeQuery('حديثا');
    expect(screen.getByTestId(`${RESULTS}-item--1-5`)).toBeOnTheScreen();
  });

  it('shows one chip per installed collection after All, in order', async () => {
    await renderUi(<HadithSearchScreen />);
    const radios = screen.getAllByRole('radio').map((node) => node.props.testID);
    expect(radios[0]).toBe('hadith-scope-chips-all');
    expect(radios).toEqual(
      expect.arrayContaining([`hadith-scope-chips-${FIXTURE_MULTI.slug}`, `hadith-scope-chips-${FIXTURE_SINGLE.slug}`]),
    );
    expect(radios).toHaveLength(3);
  });

  it('choosing a collection chip narrows the results', async () => {
    await renderUi(<HadithSearchScreen />);
    await typeQuery('FIXTURE');
    expect(screen.getByTestId('hadith-search-results-count')).toHaveTextContent('٩ نتائج');
    await press(screen.getByTestId(`hadith-scope-chips-${FIXTURE_SINGLE.slug}`));
    expect(screen.getByTestId('hadith-search-results-count')).toHaveTextContent('٣ نتائج');
  });

  it('choosing All shows every installed collection again', async () => {
    await renderUi(<HadithSearchScreen />);
    await typeQuery('FIXTURE');
    await press(screen.getByTestId(`hadith-scope-chips-${FIXTURE_SINGLE.slug}`));
    await press(screen.getByTestId('hadith-scope-chips-all'));
    expect(screen.getByTestId('hadith-search-results-count')).toHaveTextContent('٩ نتائج');
  });

  it('highlights the match on the original text by position', async () => {
    await renderUi(<HadithSearchScreen />);
    await typeQuery('تجريبي');
    const match = screen.getByText('تجريبي');
    expect(flatStyle(match.props.style).backgroundColor).toBe(themes.light.colors.highlightGold);
  });

  it('renders result text right to left and justified', async () => {
    await renderUi(<HadithSearchScreen />);
    await typeQuery('تجريبي');
    expect(flatStyle(screen.getByTestId(`${RESULTS}-item--1-5-text`).props.style)).toMatchObject({
      textAlign: 'justify',
      writingDirection: 'rtl',
    });
  });

  it('shows the result count', async () => {
    await renderUi(<HadithSearchScreen />);
    await typeQuery('تجريبي');
    expect(screen.getByTestId('hadith-search-results-count')).toHaveTextContent('نتيجة واحدة');
  });

  it('shows the no-results state and keeps the chips', async () => {
    await renderUi(<HadithSearchScreen />);
    await typeQuery('zzzzqqqq');
    expect(screen.getByTestId('hadith-state-view')).toHaveTextContent(/لا توجد نتائج/);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('a token-less query is idle, not no-results', async () => {
    await renderUi(<HadithSearchScreen />);
    await typeQuery(' ، ؟ ');
    expect(screen.queryByTestId('hadith-state-view')).toBeNull();
    expect(screen.getByTestId('hadith-search-hint')).toBeOnTheScreen();
  });

  it('submitting runs the query at once, without waiting for the debounce', async () => {
    await renderUi(<HadithSearchScreen />);
    await submitQuery('تجريبي');
    expect(screen.getByTestId(`${RESULTS}-item--1-5`)).toBeOnTheScreen();
  });

  it('tapping a result opens the reader with the slug and number', async () => {
    await renderUi(<HadithSearchScreen />);
    await typeQuery('FIXTURE');
    await press(screen.getByTestId(`${RESULTS}-item--1-1`));
    expect(router.push).toHaveBeenCalledWith(`/hadith/${FIXTURE_MULTI.slug}/hadith/1`);
  });

  it('tapping a result saves the query to the history', async () => {
    await renderUi(<HadithSearchScreen />);
    await typeQuery('تجريبي');
    await press(screen.getByTestId(`${RESULTS}-item--1-5`));
    expect(JSON.parse(storage.getString(storageKeys.hadith.searchRecent) ?? '[]')).toEqual(['تجريبي']);
  });

  it('submitting a query saves it to the history', async () => {
    await renderUi(<HadithSearchScreen />);
    await submitQuery('تجريبي');
    expect(JSON.parse(storage.getString(storageKeys.hadith.searchRecent) ?? '[]')).toEqual(['تجريبي']);
  });

  it('typing alone does not save to the history', async () => {
    await renderUi(<HadithSearchScreen />);
    await typeQuery('تجريبي');
    expect(storage.contains(storageKeys.hadith.searchRecent)).toBe(false);
  });

  it('the history keeps 20 entries, newest first', async () => {
    const seeded = Array.from({ length: 20 }, (_, index) => `FIXTURE seed ${index + 1}`);
    storage.set(storageKeys.hadith.searchRecent, JSON.stringify(seeded));
    await renderUi(<HadithSearchScreen />);
    await submitQuery('FIXTURE new');
    const list = JSON.parse(storage.getString(storageKeys.hadith.searchRecent) ?? '[]') as string[];
    expect(list).toHaveLength(20);
    expect(list[0]).toBe('FIXTURE new');
    expect(list).not.toContain('FIXTURE seed 20');
  });

  it('remove deletes one recent search', async () => {
    storage.set(storageKeys.hadith.searchRecent, JSON.stringify(['FIXTURE one', 'FIXTURE two']));
    await renderUi(<HadithSearchScreen />);
    await press(screen.getByRole('button', { name: 'إزالة FIXTURE one' }));
    expect(JSON.parse(storage.getString(storageKeys.hadith.searchRecent) ?? '[]')).toEqual(['FIXTURE two']);
  });

  it('clear history empties the hadith history only', async () => {
    storage.set(storageKeys.hadith.searchRecent, JSON.stringify(['FIXTURE one']));
    await renderUi(<HadithSearchScreen />);
    await press(screen.getByRole('button', { name: 'مسح السجل' }));
    expect(storage.contains(storageKeys.hadith.searchRecent)).toBe(false);
  });

  it('clear history leaves the Quran and Azkar histories', async () => {
    storage.set(storageKeys.searchRecentQueries, JSON.stringify(['سورة']));
    storage.set(storageKeys.azkar.searchRecent, JSON.stringify(['ذكر']));
    storage.set(storageKeys.hadith.searchRecent, JSON.stringify(['FIXTURE one']));
    await renderUi(<HadithSearchScreen />);
    await press(screen.getByRole('button', { name: 'مسح السجل' }));
    expect(JSON.parse(storage.getString(storageKeys.searchRecentQueries) ?? '[]')).toEqual(['سورة']);
    expect(JSON.parse(storage.getString(storageKeys.azkar.searchRecent) ?? '[]')).toEqual(['ذكر']);
  });

  it('shows the offline-empty state when no collection is installed', async () => {
    executor.run('DELETE FROM installed_resources');
    await renderUi(<HadithSearchScreen />);
    expect(screen.getByTestId('hadith-state-view')).toHaveTextContent(/لا توجد مجموعات محمّلة/);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByPlaceholderText(FIELD)).toBeOnTheScreen();
  });

  it('shows the loading skeleton while the content database is not ready', async () => {
    jest.mocked(useContentDb).mockReturnValue({ ready: false, error: null });
    await renderUi(<HadithSearchScreen />);
    expect(screen.getByTestId('hadith-list-skeleton')).toBeOnTheScreen();
  });

  it('makes no network request', async () => {
    const original = global.fetch;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    try {
      await renderUi(<HadithSearchScreen />);
      await typeQuery('تجريبي');
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      global.fetch = original;
    }
  });

  it('shows no grade text', async () => {
    await renderUi(<HadithSearchScreen />);
    await typeQuery('تجريبي');
    expect(screen.queryByText(/درجة|Grade/)).toBeNull();
  });
});
