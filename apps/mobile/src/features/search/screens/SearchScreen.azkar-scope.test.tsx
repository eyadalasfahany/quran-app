import { router } from 'expo-router';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { useAzkarAvailable, useAzkarSearch } from '@/features/azkar/data';

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
  useAzkarSearch: jest.fn(() => ({ entries: [], categoryIds: [] })),
}));

const hit = { entryKey: 'entry:morning:1', preview: 'نص تجريبي ١ — ليس ذكرًا', highlight: null };

describe('SearchScreen, the Azkar scope', () => {
  beforeEach(() => {
    jest.mocked(router.push).mockClear();
    jest.mocked(useAzkarAvailable).mockReturnValue(false);
    jest.mocked(useAzkarSearch).mockReturnValue({ entries: [], categoryIds: [] });
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
    expect(useAzkarSearch).toHaveBeenCalledWith('تجريبي');
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

  it('says so when no Azkar entry matches', async () => {
    jest.mocked(useAzkarAvailable).mockReturnValue(true);
    const view = await renderUi(<SearchScreen />);

    await fireEvent.changeText(view.getByTestId('search-field-input'), 'لا شيء');
    await fireEvent.press(view.getByText('الأذكار'));

    await waitFor(() => expect(view.getByTestId('search-azkar-results-empty')).toHaveTextContent('لا توجد نتائج'));
  });

  it('returns to Quran results when the Quran scope is chosen again', async () => {
    jest.mocked(useAzkarAvailable).mockReturnValue(true);
    const view = await renderUi(<SearchScreen />);

    await fireEvent.press(view.getByText('الأذكار'));
    await fireEvent.press(view.getByText('القرآن'));

    expect(view.queryByTestId('search-azkar-results')).toBeNull();
  });
});
