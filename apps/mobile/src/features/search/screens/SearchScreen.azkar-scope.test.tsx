import { router } from 'expo-router';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';
import {
  type AzkarCategoryListItem,
  useAzkarAvailable,
  useAzkarCategories,
  useAzkarSearch,
} from '@/features/azkar/data';
import { readSessionSearchScope, rememberSessionSearchScope } from '@/features/search/searchScope';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { SearchScreen } from './SearchScreen';

// The Azkar scope is tested against the data hooks, not a database: the Quran search is not reached here.
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => {
    throw new Error('openContentDb is unavailable under Jest.');
  },
  useContentDb: () => ({ error: null, ready: true }),
}));

jest.mock('@/features/azkar/data', () => ({
  useAzkarAvailable: jest.fn(() => false),
  useAzkarCategories: jest.fn(() => []),
  useAzkarSearch: jest.fn(() => ({ entries: [], categoryIds: [] })),
}));

const hit = { entryKey: 'entry:morning:1', preview: 'نص تجريبي ١ — ليس ذكرًا', highlight: null };
// A fixture chapter: its id is a real session id, its count is a placeholder, no dhikr text.
const chapter: AzkarCategoryListItem = {
  id: 'morning',
  resourceId: 1,
  kind: 'session',
  position: 1,
  occasion: null,
  progressPeriod: 'session',
  unitCount: 3,
};

const ANY_QUERY = 'تجريبي';

describe('SearchScreen, the Azkar scope', () => {
  beforeEach(() => {
    jest.mocked(router.push).mockClear();
    jest.mocked(useAzkarAvailable).mockReturnValue(false);
    jest.mocked(useAzkarSearch).mockReturnValue({ entries: [], categoryIds: [] });
    jest.mocked(useAzkarCategories).mockReturnValue([]);
    rememberSessionSearchScope('quran');
    storage.remove(storageKeys.searchRecentQueries);
  });

  it('shows no scope control without Azkar content, so search stays Quran only', async () => {
    const view = await renderUi(<SearchScreen />);

    expect(view.queryByTestId('search-scope')).toBeNull();
  });

  it('shows the scope control with Azkar content, with Quran selected first', async () => {
    jest.mocked(useAzkarAvailable).mockReturnValue(true);
    const view = await renderUi(<SearchScreen />);

    expect(view.getByTestId('search-scope')).toBeOnTheScreen();
    expect(view.getByText('القرآن')).toBeOnTheScreen();
    expect(view.getByText('الأذكار')).toBeOnTheScreen();
  });

  it('lists the Azkar entries that match, and hides the Quran results, once the Azkar scope is chosen', async () => {
    jest.mocked(useAzkarAvailable).mockReturnValue(true);
    jest.mocked(useAzkarSearch).mockReturnValue({ entries: [hit], categoryIds: [] });
    const view = await renderUi(<SearchScreen />);

    await fireEvent.changeText(view.getByTestId('search-field-input'), 'تجريبي');
    await fireEvent.press(view.getByText('الأذكار'));

    await waitFor(() => expect(view.getByTestId('search-azkar-results-result-1')).toBeOnTheScreen());
    expect(view.queryByTestId('search-results')).toBeNull();
    // The Azkar hook is fed the debounced query, so it runs once the typed text has settled.
    await waitFor(() => expect(useAzkarSearch).toHaveBeenLastCalledWith('تجريبي'));
  });

  it('opens the Azkar entry reader when a result is tapped, and remembers the query', async () => {
    jest.mocked(useAzkarAvailable).mockReturnValue(true);
    jest.mocked(useAzkarSearch).mockReturnValue({ entries: [hit], categoryIds: [] });
    const view = await renderUi(<SearchScreen />);

    await fireEvent.changeText(view.getByTestId('search-field-input'), 'تجريبي');
    await fireEvent.press(view.getByText('الأذكار'));
    await waitFor(() => expect(view.getByTestId('search-azkar-results-result-1')).toBeOnTheScreen());
    await fireEvent.press(view.getByTestId('search-azkar-results-result-1'));

    expect(router.push).toHaveBeenCalledWith('/azkar/entry/entry%3Amorning%3A1');
  });

  it('says so when no Azkar entry matches, with the Azkar copy and not the Quran one', async () => {
    jest.mocked(useAzkarAvailable).mockReturnValue(true);
    const view = await renderUi(<SearchScreen />);

    await fireEvent.changeText(view.getByTestId('search-field-input'), 'لا شيء');
    await fireEvent.press(view.getByText('الأذكار'));

    await waitFor(() => expect(view.getByTestId('search-azkar-results-empty')).toBeOnTheScreen());
    expect(view.getByText('لا توجد نتائج مطابقة')).toBeOnTheScreen();
    expect(view.getByText('جرّب كلمة أخرى.')).toBeOnTheScreen();
    expect(view.queryByTestId('search-no-results')).toBeNull();
  });

  it('returns to Quran results when the Quran scope is chosen again', async () => {
    jest.mocked(useAzkarAvailable).mockReturnValue(true);
    const view = await renderUi(<SearchScreen />);

    await fireEvent.press(view.getByText('الأذكار'));
    await fireEvent.press(view.getByText('القرآن'));

    expect(view.queryByTestId('search-azkar-results')).toBeNull();
  });

  describe('placeholder and idle state per scope', () => {
    beforeEach(() => {
      jest.mocked(useAzkarAvailable).mockReturnValue(true);
    });

    it('keeps the Quran placeholder, with no hint line, under the Quran scope', async () => {
      const view = await renderUi(<SearchScreen />);

      expect(view.getByPlaceholderText('ابحث بآية أو سورة أو رقمها')).toBeOnTheScreen();
      expect(view.queryByText('ابحث بالآية، رقم السورة، أو اسمها')).toBeNull();
      expect(view.getByTestId('search-empty')).toHaveTextContent(
        'ابحث بكلمة من الآية أو باسم السورة أو رقمها، وستظهر الآيات والسور التي تطابقها.',
      );
    });

    it('sets the Quran idle hint in the same caption style as the Azkar idle line', async () => {
      const view = await renderUi(<SearchScreen />);
      const quranStyle = flatStyle(view.getByTestId('search-empty').props.style);

      await fireEvent.press(view.getByText('الأذكار'));

      expect(flatStyle(view.getByTestId('search-azkar-idle-hint').props.style)).toEqual(quranStyle);
    });

    it('shows the Azkar placeholder and idle copy under the Azkar scope, with no hint line and not the Quran ones', async () => {
      const view = await renderUi(<SearchScreen />);

      await fireEvent.press(view.getByText('الأذكار'));

      expect(view.getByPlaceholderText('ابحث بكلمة أو باسم الباب')).toBeOnTheScreen();
      expect(view.queryByText('ابحث بكلمة من الذكر أو باسم الباب')).toBeNull();
      expect(view.getByTestId('search-azkar-idle-hint')).toHaveTextContent(
        'ابحث بالكلمة أو بجزء منها، وستظهر الأبواب والأذكار التي تطابقها.',
      );
      expect(view.queryByText('ابحث بآية أو سورة أو رقمها')).toBeNull();
      expect(view.queryByText('ابحث بالآية، رقم السورة، أو اسمها')).toBeNull();
      expect(view.queryByTestId('search-empty')).toBeNull();
    });

    it('lists the recent searches in the Azkar idle state, and runs one when it is picked', async () => {
      storage.set(storageKeys.searchRecentQueries, JSON.stringify(['الصباح']));
      const view = await renderUi(<SearchScreen />);

      await fireEvent.press(view.getByText('الأذكار'));
      await fireEvent.press(view.getByTestId('search-azkar-idle-recent-0'));

      expect(view.getByTestId('search-field-input').props.value).toBe('الصباح');
      await waitFor(() => expect(useAzkarSearch).toHaveBeenLastCalledWith('الصباح'));
    });

    it('clears the recent searches from the Azkar idle state', async () => {
      storage.set(storageKeys.searchRecentQueries, JSON.stringify(['الصباح']));
      const view = await renderUi(<SearchScreen />);

      await fireEvent.press(view.getByText('الأذكار'));
      await fireEvent.press(view.getByRole('button', { name: 'مسح السجل' }));

      expect(view.queryByTestId('search-azkar-idle-recent')).toBeNull();
      expect(storage.getString(storageKeys.searchRecentQueries)).toBeUndefined();
    });

    it.each(locales)('shows the Azkar placeholder and the Azkar chip in %s', async (locale) => {
      const placeholder = locale === 'ar' ? 'ابحث بكلمة أو باسم الباب' : 'Search by a word or chapter title';
      const tab = locale === 'ar' ? 'الأذكار' : 'Azkar';
      const view = await renderUi(<SearchScreen />, { locale });

      await fireEvent.press(view.getByRole('radio', { name: tab }));

      expect(view.getByPlaceholderText(placeholder)).toBeOnTheScreen();
    });
  });

  describe('switching scope', () => {
    beforeEach(() => {
      jest.mocked(useAzkarAvailable).mockReturnValue(true);
    });

    it('keeps the typed query and runs it again in the new scope', async () => {
      const view = await renderUi(<SearchScreen />);

      await fireEvent.changeText(view.getByTestId('search-field-input'), ANY_QUERY);
      await fireEvent.press(view.getByText('الأذكار'));

      expect(view.getByTestId('search-field-input').props.value).toBe(ANY_QUERY);
      await waitFor(() => expect(useAzkarSearch).toHaveBeenLastCalledWith(ANY_QUERY));
    });

    it('does not show the empty state while the query is still debouncing', async () => {
      const view = await renderUi(<SearchScreen />);

      await fireEvent.press(view.getByText('الأذكار'));
      await fireEvent.changeText(view.getByTestId('search-field-input'), ANY_QUERY);

      expect(view.queryByTestId('search-azkar-results-empty')).toBeNull();
      expect(view.queryByText('لا توجد نتائج مطابقة')).toBeNull();
      await waitFor(() => expect(view.getByTestId('search-azkar-results-empty')).toBeOnTheScreen());
    });

    it('opens on the scope the reader chose earlier in the session', async () => {
      rememberSessionSearchScope('azkar');
      const view = await renderUi(<SearchScreen />);

      expect(view.getByPlaceholderText('ابحث بكلمة أو باسم الباب')).toBeOnTheScreen();
      expect(view.getByRole('radio', { name: 'الأذكار', checked: true })).toBeOnTheScreen();
    });

    it('remembers a scope the reader picks, for the next visit', async () => {
      const view = await renderUi(<SearchScreen />);

      await fireEvent.press(view.getByRole('radio', { name: 'الأذكار' }));

      expect(view.getByRole('radio', { name: 'الأذكار', checked: true })).toBeOnTheScreen();
      expect(readSessionSearchScope()).toBe('azkar');
    });
  });

  describe('chapter matches', () => {
    beforeEach(() => {
      jest.mocked(useAzkarAvailable).mockReturnValue(true);
      jest.mocked(useAzkarCategories).mockReturnValue([chapter]);
    });

    it('opens a matching chapter in the Azkar category screen', async () => {
      jest.mocked(useAzkarSearch).mockReturnValue({ entries: [], categoryIds: ['morning'] });
      const view = await renderUi(<SearchScreen />);

      await fireEvent.changeText(view.getByTestId('search-field-input'), 'الصباح');
      await fireEvent.press(view.getByText('الأذكار'));
      await waitFor(() => expect(view.getByTestId('search-azkar-results-chapter-morning')).toBeOnTheScreen());
      await fireEvent.press(view.getByTestId('search-azkar-results-chapter-morning'));

      expect(router.push).toHaveBeenCalledWith('/azkar/category/morning');
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      jest.mocked(useAzkarAvailable).mockReturnValue(true);
    });

    it('exposes the scope as a radio group with the selected scope checked', async () => {
      const view = await renderUi(<SearchScreen />);

      // The container is not an accessible element itself, so RNTL's role query skips it; its props carry the label.
      expect(view.getByTestId('search-scope').props).toMatchObject({ accessibilityLabel: 'نطاق البحث' });
      expect(view.getByRole('radio', { name: 'القرآن', checked: true })).toBeOnTheScreen();
      expect(view.getByRole('radio', { name: 'الأذكار', checked: false })).toBeOnTheScreen();

      await fireEvent.press(view.getByRole('radio', { name: 'الأذكار' }));

      expect(view.getByRole('radio', { name: 'الأذكار', checked: true })).toBeOnTheScreen();
      expect(view.getByRole('radio', { name: 'القرآن', checked: false })).toBeOnTheScreen();
    });

    it('sets the field label from the scope, so the field is named for what it searches', async () => {
      const view = await renderUi(<SearchScreen />);
      expect(view.getByTestId('search-field-input').props.accessibilityLabel).toBe('ابحث بآية أو سورة أو رقمها');

      await fireEvent.press(view.getByRole('radio', { name: 'الأذكار' }));

      expect(view.getByTestId('search-field-input').props.accessibilityLabel).toBe('ابحث بكلمة أو باسم الباب');
    });
  });
});
