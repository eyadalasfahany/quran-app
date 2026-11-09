import { router } from 'expo-router';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { useAzkarAvailable } from '@/features/azkar/data';
import { useHadithAvailable, useHadithSearch } from '@/features/hadith/hooks';
import { hadithHref } from '@/features/hadith/routes';
import { readSessionSearchScope, rememberSessionSearchScope } from '@/features/search/searchScope';

import { renderUi } from '../../../../jest/render-ui';
import { SearchScreen } from './SearchScreen';

// The hadith scope is tested against its hooks, not a database. The results list is a stub: its rows are not the subject here.
jest.mock('@/features/hadith/components/HadithSearchResults', () => {
  const { Pressable: Touchable, Text: Label, View: Box } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HadithSearchResults: ({
      hits,
      onOpen,
      total,
    }: {
      hits: { item: { hadithNumber: string } }[];
      total: number;
      onOpen: (hit: unknown) => void;
    }) => (
      <Box testID="hadith-search-results">
        <Label>{`total ${total}`}</Label>
        {hits.map((hit, index) => (
          <Touchable accessibilityRole="button" key={index} onPress={() => onOpen(hit)} testID={`hadith-hit-${index}`}>
            <Label>{hit.item.hadithNumber}</Label>
          </Touchable>
        ))}
      </Box>
    ),
  };
});

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

jest.mock('@/features/hadith/hooks', () => ({
  useHadithAvailable: jest.fn(() => false),
  useHadithSearch: jest.fn(),
}));

const hit = { item: { hadithNumber: '1' }, collection: { slug: 'bukhari' } };

function fakeSearch({ query }: { query: string }) {
  const hasTokens = query.trim().length > 0;
  return { hits: hasTokens ? [hit] : [], hasMore: false, total: hasTokens ? 1 : 0, hasTokens };
}

describe('SearchScreen, the Hadith scope', () => {
  beforeEach(() => {
    jest.mocked(router.push).mockClear();
    jest.mocked(useAzkarAvailable).mockReturnValue(false);
    jest.mocked(useHadithAvailable).mockReturnValue(true);
    jest.mocked(useHadithSearch).mockImplementation(fakeSearch as never);
    rememberSessionSearchScope('quran');
    storage.remove(storageKeys.searchRecentQueries);
    storage.remove(storageKeys.hadith.searchRecent);
  });

  it('shows no scope chips without hadith or azkar content, so search stays Quran only', async () => {
    jest.mocked(useHadithAvailable).mockReturnValue(false);
    const view = await renderUi(<SearchScreen />);

    expect(view.queryByTestId('search-scope')).toBeNull();
    expect(view.queryByRole('radio', { name: 'الحديث' })).toBeNull();
  });

  it('shows the Hadith chip only when hadith content is installed, between Quran and Azkar', async () => {
    jest.mocked(useAzkarAvailable).mockReturnValue(true);
    const view = await renderUi(<SearchScreen />);

    const ids = view.getAllByRole('radio').map((node) => node.props.testID);
    expect(ids).toEqual(['search-scope-quran', 'search-scope-hadith', 'search-scope-azkar']);
  });

  it('shows the Hadith placeholder, with no hint line, once the Hadith scope is chosen, and no Azkar copy', async () => {
    const view = await renderUi(<SearchScreen />);

    await fireEvent.press(view.getByRole('radio', { name: 'الحديث' }));

    expect(view.getByPlaceholderText('ابحث بكلمة من نص الحديث')).toBeOnTheScreen();
    expect(view.queryByText('ابحث بكلمة من نص الحديث')).toBeNull();
    expect(view.queryByPlaceholderText('ابحث بآية أو سورة أو رقمها')).toBeNull();
    expect(view.queryByTestId('search-recent')).toBeNull();
  });

  it('shows the hadith idle hint with no recent searches, where nothing else showed before', async () => {
    const view = await renderUi(<SearchScreen />);

    await fireEvent.press(view.getByRole('radio', { name: 'الحديث' }));

    expect(view.getByTestId('search-hadith-idle-hint')).toHaveTextContent(
      'ابحث بالكلمة أو بجزء منها، وستظهر الأحاديث التي تطابقها من الكتب المحمّلة.',
    );
    expect(view.queryByTestId('hadith-recent-searches')).toBeNull();
  });

  it('keeps the hadith idle hint under the recent searches when there are some', async () => {
    storage.set(storageKeys.hadith.searchRecent, JSON.stringify(['النية']));
    const view = await renderUi(<SearchScreen />);

    await fireEvent.press(view.getByRole('radio', { name: 'الحديث' }));

    expect(view.getByTestId('hadith-recent-searches-row-النية')).toBeOnTheScreen();
    expect(view.getByTestId('search-hadith-idle-hint')).toBeOnTheScreen();
  });

  it('hides the hadith idle hint once a query is typed', async () => {
    const view = await renderUi(<SearchScreen />);

    await fireEvent.press(view.getByRole('radio', { name: 'الحديث' }));
    await fireEvent.changeText(view.getByTestId('search-field-input'), 'النية');

    await waitFor(() => expect(view.getByTestId('hadith-hit-0')).toBeOnTheScreen());
    expect(view.queryByTestId('search-hadith-idle-hint')).toBeNull();
  });

  it('runs the hadith search over all installed collections and lists the hits', async () => {
    const view = await renderUi(<SearchScreen />);

    await fireEvent.press(view.getByRole('radio', { name: 'الحديث' }));
    await fireEvent.changeText(view.getByTestId('search-field-input'), 'النية');

    await waitFor(() => expect(view.getByTestId('hadith-hit-0')).toBeOnTheScreen());
    expect(useHadithSearch).toHaveBeenLastCalledWith({ query: 'النية', scope: null, limit: expect.any(Number) });
    expect(view.queryByTestId('search-results')).toBeNull();
  });

  it('opens the hadith reader when a hit is tapped', async () => {
    const view = await renderUi(<SearchScreen />);

    await fireEvent.press(view.getByRole('radio', { name: 'الحديث' }));
    await fireEvent.changeText(view.getByTestId('search-field-input'), 'النية');
    await waitFor(() => expect(view.getByTestId('hadith-hit-0')).toBeOnTheScreen());
    await fireEvent.press(view.getByTestId('hadith-hit-0'));

    expect(router.push).toHaveBeenCalledWith(hadithHref.reader('bukhari', '1'));
  });

  it('falls back to the Quran scope when the remembered hadith scope is no longer available', async () => {
    rememberSessionSearchScope('hadith');
    jest.mocked(useHadithAvailable).mockReturnValue(false);
    const view = await renderUi(<SearchScreen />);

    expect(view.getByPlaceholderText('ابحث بآية أو سورة أو رقمها')).toBeOnTheScreen();
    expect(view.queryByTestId('search-scope')).toBeNull();
    expect(readSessionSearchScope()).toBe('hadith');
  });

  it('does not run the hadith search under the Quran scope', async () => {
    const view = await renderUi(<SearchScreen />);

    await fireEvent.changeText(view.getByTestId('search-field-input'), 'النية');
    await waitFor(() => expect(useHadithSearch).toHaveBeenCalled());
    expect(useHadithSearch).toHaveBeenLastCalledWith({ query: '', scope: null, limit: expect.any(Number) });
    expect(view.queryByTestId('hadith-search-results')).toBeNull();
  });
});
