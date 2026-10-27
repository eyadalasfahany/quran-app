import { render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { ThemeProvider } from '@/core/theme';

import { openReaderTestContent } from '../../../jest/reader-test-db';
import { pageForVerse } from './anchor/page';
import { MushafList, mushafPageIndexForVerseKey, verseKeyForMushafPage } from './MushafList';

const mockScrollToIndex = jest.fn();

jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { ScrollView } = require('react-native');
  const FlashList = React.forwardRef(function MockFlashList(props: Record<string, unknown>, ref: unknown) {
    const { data, renderItem, initialScrollIndex, ...rest } = props as {
      data?: number[];
      initialScrollIndex?: number;
      renderItem: (info: { item: number; index: number }) => ReactNode;
    };
    React.useImperativeHandle(ref, () => ({
      scrollToIndex: (args: { index: number }) => {
        mockScrollToIndex(args);
        const page = data?.[args.index];
        if (page !== undefined) {
          renderItem({ item: page, index: args.index });
        }
      },
    }));
    const start = initialScrollIndex ?? 0;
    const page = data?.[start];
    return (
      <ScrollView {...rest}>
        {page !== undefined ? renderItem({ item: page, index: start }) : null}
      </ScrollView>
    );
  });
  return { FlashList };
});

jest.mock('@/features/reader/mushaf/useMushafPageFont', () => ({
  useMushafPageFont: () => ({ status: 'error' as const }),
}));

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844 }),
}));

let mockTestExecutor: SqlExecutor;

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => ({
    db: {},
    executor: mockTestExecutor,
  }),
  useContentDb: () => ({ ready: true, error: null }),
}));

beforeAll(async () => {
  const opened = await openReaderTestContent();
  mockTestExecutor = opened.executor;
});

describe('MushafList', () => {
  it('scrolls to the mushaf page for 2:255', async () => {
    const page = pageForVerse(mockTestExecutor, '2:255');
    expect(page).toBeDefined();
    expect(mushafPageIndexForVerseKey(mockTestExecutor, '2:255')).toBe((page ?? 1) - 1);

    await render(
      <ThemeProvider name="light">
        <MushafList anchorVerseKey="2:255" onSwitchToReading={() => undefined} testID="mushaf" />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(mockScrollToIndex).toHaveBeenCalledWith({ animated: false, index: mushafPageIndexForVerseKey(mockTestExecutor, '2:255') });
    });
  });

  it('round-trips page and verse keys', () => {
    const page = pageForVerse(mockTestExecutor, '2:255');
    expect(page).toBeDefined();
    if (page === undefined) {
      return;
    }
    const verseKey = verseKeyForMushafPage(mockTestExecutor, page);
    expect(verseKey).toEqual(expect.any(String));
    expect(pageForVerse(mockTestExecutor, verseKey!)).toBe(page);
  });

  it('shows the placeholder when the font fails', async () => {
    const view = await render(
      <ThemeProvider name="light">
        <MushafList anchorVerseKey="1:1" onSwitchToReading={() => undefined} testID="mushaf" />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(view.getByTestId('mushaf-page-1-placeholder')).toBeOnTheScreen();
    });
  });
});
