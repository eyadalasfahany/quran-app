import { fireEvent, screen } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { useAzkarSearch } from '@/features/azkar/data';

import { AzkarSearchResults } from './AzkarSearchResults';

jest.mock('@/features/azkar/data', () => ({
  useAzkarSearch: jest.fn(),
}));

const hits = [
  { entryKey: 'entry:one', preview: 'نص تجريبي ١ — ليس ذكرًا', highlight: { start: 0, end: 4 } },
  { entryKey: 'entry:two', preview: 'نص تجريبي ٢ — ليس ذكرًا', highlight: null },
];

describe('AzkarSearchResults', () => {
  beforeEach(() => {
    jest.mocked(useAzkarSearch).mockReturnValue({ entries: [], categoryIds: [] });
  });

  it('renders nothing for an empty query', async () => {
    await renderUi(<AzkarSearchResults onOpen={jest.fn()} query="   " />);

    expect(screen.queryByTestId('search-azkar-results')).toBeNull();
    expect(screen.queryByTestId('search-azkar-results-empty')).toBeNull();
  });

  it('says so when no entry matches', async () => {
    await renderUi(<AzkarSearchResults onOpen={jest.fn()} query="شيء" />);

    expect(screen.getByTestId('search-azkar-results-empty')).toHaveTextContent('لا توجد نتائج');
  });

  it('lists one row per matching entry, numbered from one', async () => {
    jest.mocked(useAzkarSearch).mockReturnValue({ entries: hits, categoryIds: [] });
    await renderUi(<AzkarSearchResults onOpen={jest.fn()} query="تجريبي" />);

    expect(screen.getByTestId('search-azkar-results-result-1')).toBeOnTheScreen();
    expect(screen.getByTestId('search-azkar-results-result-2')).toBeOnTheScreen();
  });

  it('opens the entry of the row that is tapped', async () => {
    const onOpen = jest.fn();
    jest.mocked(useAzkarSearch).mockReturnValue({ entries: hits, categoryIds: [] });
    await renderUi(<AzkarSearchResults onOpen={onOpen} query="تجريبي" />);

    await fireEvent.press(screen.getByTestId('search-azkar-results-result-2'));

    expect(onOpen).toHaveBeenCalledWith('entry:two');
  });

  it('searches the query it is given', async () => {
    await renderUi(<AzkarSearchResults onOpen={jest.fn()} query="تجريبي" />);

    expect(useAzkarSearch).toHaveBeenCalledWith('تجريبي');
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/search/components/AzkarSearchResults.tsx')).toEqual([]);
  });
});
