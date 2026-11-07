import { fireEvent, screen } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { listItemFixture, PLACEHOLDER_TEXT, searchHitFixture } from '../../../../jest/hadith-ui-fixtures';
import type { HadithSearchResultHit } from '../data';

import { HadithSearchResults } from './HadithSearchResults';

const TEST_ID = 'hadith-search-results';

// Placeholder hits: every text is a marked placeholder, never a hadith or a book title.
function hit(id: number): HadithSearchResultHit {
  const base = searchHitFixture({ item: listItemFixture({ id, textAr: PLACEHOLDER_TEXT }) });
  return { ...base, book: { bookNumber: '1', titleAr: '[اسم الكتاب]', titleEn: null } };
}

const HITS = [hit(1), hit(2), hit(3)];

function renderResults(
  options: { hits?: HadithSearchResultHit[]; total?: number; hasMore?: boolean; locale?: 'ar' | 'en' } = {},
) {
  const onLoadMore = jest.fn();
  const onOpen = jest.fn();
  const view = renderUi(
    <HadithSearchResults
      hasMore={options.hasMore ?? false}
      hits={options.hits ?? HITS}
      onLoadMore={onLoadMore}
      onOpen={onOpen}
      total={options.total ?? HITS.length}
    />,
    { locale: options.locale ?? 'ar' },
  );
  return { onLoadMore, onOpen, view };
}

describe('HadithSearchResults', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    const { view } = renderResults({ locale });
    await view;
    expect(screen.getByTestId(TEST_ID)).toBeOnTheScreen();
    expect(screen.getByTestId(`${TEST_ID}-item-${HITS[0]?.item.resourceId}-1`)).toBeOnTheScreen();
  });

  it('shows the count line with Arabic digits in Arabic', async () => {
    await renderResults({ total: 32 }).view;
    expect(screen.getByTestId(`${TEST_ID}-count`)).toHaveTextContent('٣٢ نتيجة');
  });

  it('shows the count line in English', async () => {
    await renderResults({ total: 32, locale: 'en' }).view;
    expect(screen.getByTestId(`${TEST_ID}-count`)).toHaveTextContent('32 results');
  });

  it('renders one row per hit', async () => {
    await renderResults().view;
    for (const id of [1, 2, 3]) {
      expect(screen.getByTestId(`${TEST_ID}-item-${HITS[0]?.item.resourceId}-${id}`)).toBeOnTheScreen();
    }
  });

  it('tapping a row calls onOpen with that hit', async () => {
    const { onOpen, view } = renderResults();
    await view;
    await press(screen.getByTestId(`${TEST_ID}-item-${HITS[0]?.item.resourceId}-2`));
    expect(onOpen).toHaveBeenCalledWith(HITS[1]);
  });

  it('calls onLoadMore at the end only when hasMore', async () => {
    const first = renderResults({ hasMore: false });
    await first.view;
    fireEvent(screen.getByTestId(TEST_ID), 'onEndReached');
    expect(first.onLoadMore).not.toHaveBeenCalled();
  });

  it('calls onLoadMore at the end when more pages exist', async () => {
    const more = renderResults({ hasMore: true });
    await more.view;
    fireEvent(screen.getByTestId(TEST_ID), 'onEndReached');
    expect(more.onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('the count line is a polite live region', async () => {
    await renderResults().view;
    expect(screen.getByTestId(`${TEST_ID}-count`)).toHaveProp('accessibilityLiveRegion', 'polite');
  });
});
