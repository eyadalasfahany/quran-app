import { router } from 'expo-router';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { themes } from '@/core/theme';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { SearchScreen } from './SearchScreen';

// Records the props the avoiding view is given: React Native strips `behavior` before the host view, so the tree can't show it.
const mockKeyboardAvoiding = jest.fn();

jest.mock('react-native/Libraries/Components/Keyboard/KeyboardAvoidingView', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: (props: { children?: ReactNode; testID?: string }) => {
      mockKeyboardAvoiding(props);
      return createElement(View, { testID: props.testID }, props.children);
    },
  };
});

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 59 }) };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
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
  it('opens on the search bar, field and Cancel, then the hint, with no title (the Search frame)', async () => {
    const view = await renderUi(<SearchScreen />);

    expect(flatStyle(view.getByTestId('screen-search').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surface,
      paddingTop: 59,
    });
    expect(view.queryByRole('header', { name: 'البحث' })).toBeNull();
    expect(view.getByTestId('search-field-input')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'إلغاء' })).toBeOnTheScreen();
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
    await fireEvent.press(view.getByRole('button', { name: /البقرة · ٢٥٥/ }));

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

  describe('keyboard in a short window', () => {
    let platformOS: { restore: () => void } | undefined;
    afterEach(() => {
      platformOS?.restore();
      platformOS = undefined;
    });

    it('lifts the column with padding on iOS, so the results stay in view with the keyboard up', async () => {
      platformOS = jest.replaceProperty(Platform, 'OS', 'ios');
      const view = await renderUi(<SearchScreen />);

      // React Native keeps the behaviour prop off the host view, so the avoiding view is recorded by a thin mock.
      expect(mockKeyboardAvoiding).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'padding' }));
      expect(view.getByTestId('search-keyboard')).toBeOnTheScreen();
    });

    it('shrinks the column by height on Android, the same avoiding view', async () => {
      platformOS = jest.replaceProperty(Platform, 'OS', 'android');
      await renderUi(<SearchScreen />);

      expect(mockKeyboardAvoiding).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'height' }));
    });

    it('keeps the search field inside the avoiding view, so it stays visible while the results scroll', async () => {
      const view = await renderUi(<SearchScreen />);

      expect(within(view.getByTestId('search-keyboard')).getByTestId('search-field-input')).toBeOnTheScreen();
    });
  });

  it.each(locales)('leaves search through Cancel in %s', async (locale) => {
    const view = await renderUi(<SearchScreen />, { locale });

    await fireEvent.press(view.getByRole('button', { name: locale === 'ar' ? 'إلغاء' : 'Cancel' }));
    expect(router.back).toHaveBeenCalled();
    expect(view.getByLabelText(locale === 'ar' ? 'ابحث في القرآن' : 'Search the Quran')).toBeOnTheScreen();
  });
});
