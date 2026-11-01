import { fireEvent, waitFor } from '@testing-library/react-native';

import { featureComponentLiterals } from '../../../../jest/ui-source';
import { locales, renderUi } from '../../../../jest/render-ui';
import { type AzkarCategoryListItem, useAzkarCategories, useAzkarSearch } from '@/features/azkar/data';

import { AzkarSearchResults } from './AzkarSearchResults';

jest.mock('@/features/azkar/data', () => ({
  useAzkarCategories: jest.fn(() => []),
  useAzkarSearch: jest.fn(() => ({ entries: [], categoryIds: [] })),
}));

// Placeholder fixtures: the id is a real session id, the count is a placeholder, and no dhikr text is used.
const chapter: AzkarCategoryListItem = {
  id: 'morning',
  resourceId: 1,
  kind: 'session',
  position: 1,
  occasion: null,
  progressPeriod: 'session',
  unitCount: 3,
};
const hit = { entryKey: 'entry:morning:1', preview: 'نص تجريبي ١ — ليس ذكرًا', highlight: null };

describe('AzkarSearchResults', () => {
  beforeEach(() => {
    jest.mocked(useAzkarSearch).mockReturnValue({ entries: [], categoryIds: [] });
    jest.mocked(useAzkarCategories).mockReturnValue([chapter]);
  });

  it('lists matching chapters and dhikr, each with its own heading', async () => {
    jest.mocked(useAzkarSearch).mockReturnValue({ entries: [hit], categoryIds: ['morning'] });
    const view = await renderUi(
      <AzkarSearchResults onOpenChapter={jest.fn()} onOpenEntry={jest.fn()} pending={false} query="الصباح" />,
    );

    expect(view.getByTestId('search-azkar-results-chapters')).toHaveTextContent('الأبواب');
    expect(view.getByTestId('search-azkar-results-chapter-morning')).toBeOnTheScreen();
    expect(view.getByTestId('search-azkar-results-entries')).toHaveTextContent('الأذكار');
    expect(view.getByTestId('search-azkar-results-result-1')).toBeOnTheScreen();
  });

  it('opens the chapter or the dhikr that is tapped', async () => {
    jest.mocked(useAzkarSearch).mockReturnValue({ entries: [hit], categoryIds: ['morning'] });
    const onOpenChapter = jest.fn();
    const onOpenEntry = jest.fn();
    const view = await renderUi(
      <AzkarSearchResults onOpenChapter={onOpenChapter} onOpenEntry={onOpenEntry} pending={false} query="الصباح" />,
    );

    await fireEvent.press(view.getByTestId('search-azkar-results-chapter-morning'));
    await fireEvent.press(view.getByTestId('search-azkar-results-result-1'));

    expect(onOpenChapter).toHaveBeenCalledWith('morning');
    expect(onOpenEntry).toHaveBeenCalledWith('entry:morning:1');
  });

  it.each(locales)('says no results match, with a suggestion to try another word, in %s', async (locale) => {
    const title = locale === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching results';
    const suggestion = locale === 'ar' ? 'جرّب كلمة أخرى.' : 'Try another word.';
    const view = await renderUi(
      <AzkarSearchResults onOpenChapter={jest.fn()} onOpenEntry={jest.fn()} pending={false} query="لا شيء" />,
      { locale },
    );

    await waitFor(() => expect(view.getByTestId('search-azkar-results-empty')).toBeOnTheScreen());
    expect(view.getByRole('header', { name: title })).toBeOnTheScreen();
    expect(view.getByText(suggestion)).toBeOnTheScreen();
  });

  it('shows nothing while the query is still debouncing, so no empty state flashes', async () => {
    const view = await renderUi(
      <AzkarSearchResults onOpenChapter={jest.fn()} onOpenEntry={jest.fn()} pending query="لا شيء" />,
    );

    expect(view.queryByTestId('search-azkar-results-empty')).toBeNull();
    expect(view.queryByTestId('search-azkar-results')).toBeNull();
  });

  it('shows nothing for a blank query', async () => {
    const view = await renderUi(
      <AzkarSearchResults onOpenChapter={jest.fn()} onOpenEntry={jest.fn()} pending={false} query="   " />,
    );

    expect(view.queryByTestId('search-azkar-results-empty')).toBeNull();
  });

  it('keeps the results on screen while a newer query is still debouncing', async () => {
    jest.mocked(useAzkarSearch).mockReturnValue({ entries: [hit], categoryIds: [] });
    const view = await renderUi(
      <AzkarSearchResults onOpenChapter={jest.fn()} onOpenEntry={jest.fn()} pending query="الصباح" />,
    );

    expect(view.getByTestId('search-azkar-results-result-1')).toBeOnTheScreen();
  });

  it('draws its colours from the theme, with no literal colour in the component', () => {
    expect(featureComponentLiterals('features/search/components/AzkarSearchResults.tsx')).toEqual([]);
  });
});
