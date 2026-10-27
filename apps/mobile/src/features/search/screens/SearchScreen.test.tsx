import { router } from 'expo-router';
import { fireEvent, waitFor } from '@testing-library/react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { themes } from '@/core/theme';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { SearchScreen } from './SearchScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 59 }) };
});

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

let mockExecutor: SqlExecutor | undefined;

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => {
    if (mockExecutor === undefined) {
      throw new Error('openContentDb is unavailable under Jest.');
    }
    return { db: {}, executor: mockExecutor };
  },
  useContentDb: () => ({ error: null, ready: true }),
}));

let seeded: SqlExecutor;

beforeAll(async () => {
  seeded = (await openReaderTestContent()).executor;
});

beforeEach(() => {
  mockExecutor = seeded;
  storage.remove(storageKeys.searchRecentQueries);
  jest.mocked(router.push).mockClear();
});

describe('SearchScreen', () => {
  it('renders the header: title, search field, then the hint', async () => {
    const view = await renderUi(<SearchScreen />);

    expect(flatStyle(view.getByTestId('screen-search').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surface,
      paddingTop: 59,
    });
    expect(view.getByRole('header', { name: 'البحث' })).toBeOnTheScreen();
    expect(view.getByTestId('search-field-input')).toBeOnTheScreen();
    expect(view.getByText('ابحث بالآية، رقم السورة، أو اسمها')).toBeOnTheScreen();
  });

  it('invites typing before a query, with no recent searches', async () => {
    const view = await renderUi(<SearchScreen />);

    expect(view.getByTestId('search-empty')).toHaveTextContent('ابدأ بالكتابة للبحث في القرآن');
    expect(view.queryByTestId('search-recent')).toBeNull();
  });

  it('lists recent searches and runs one when it is picked', async () => {
    storage.set(storageKeys.searchRecentQueries, JSON.stringify(['2:255']));
    const view = await renderUi(<SearchScreen />);

    await fireEvent.press(view.getByTestId('search-recent-2:255'));

    await waitFor(() => expect(view.getByTestId('search-results')).toBeOnTheScreen());
    expect(view.getByTestId('search-field-input').props.value).toBe('2:255');
  });

  it('opens a verse found by its key', async () => {
    const view = await renderUi(<SearchScreen />);

    await fireEvent.changeText(view.getByTestId('search-field-input'), '2:255');
    await waitFor(() => expect(view.getByTestId('search-results')).toBeOnTheScreen());
    await fireEvent.press(view.getByRole('button', { name: /2:255/ }));

    expect(router.push).toHaveBeenCalledWith('/read/2:255');
  });

  it('finds a surah by its Arabic name', async () => {
    const view = await renderUi(<SearchScreen />);

    await fireEvent.changeText(view.getByTestId('search-field-input'), 'البقرة');

    await waitFor(() => expect(view.getByTestId('search-surah-2')).toBeOnTheScreen());
  });

  it('says so when nothing matches', async () => {
    const view = await renderUi(<SearchScreen />);

    await fireEvent.changeText(view.getByTestId('search-field-input'), '999:999');

    await waitFor(() => expect(view.getByTestId('search-no-results')).toHaveTextContent('لا توجد نتائج'));
    expect(view.queryByTestId('search-empty')).toBeNull();
  });

  it.each(locales)('renders the title in %s', async (locale) => {
    const view = await renderUi(<SearchScreen />, { locale });

    expect(view.getByRole('header', { name: locale === 'ar' ? 'البحث' : 'Search' })).toBeOnTheScreen();
    expect(view.getByLabelText(locale === 'ar' ? 'ابحث في القرآن' : 'Search the Quran')).toBeOnTheScreen();
  });
});
