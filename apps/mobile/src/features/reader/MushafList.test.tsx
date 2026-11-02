import { render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { ThemeProvider } from '@/core/theme';

import { openReaderTestContent } from '../../../jest/reader-test-db';
import { pageForVerse } from './anchor/page';
import { MushafList, mushafPageIndexForVerseKey, verseKeyForMushafPage } from './MushafList';

const mockScrollToIndex = jest.fn();
let lastInitialScrollIndex: number | undefined;
let viewableHandler:
  | ((info: { viewableItems: { isViewable: boolean; item: number; index: number | null }[] }) => void)
  | undefined;

jest.mock('@shopify/flash-list', () => {
  // jest.mock factories run before imports are hoisted, so they must require.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ScrollView } = require('react-native');
  const FlashList = React.forwardRef(function MockFlashList(props: Record<string, unknown>, ref: unknown) {
    const { data, renderItem, initialScrollIndex, onViewableItemsChanged, ...rest } = props as {
      data?: number[];
      initialScrollIndex?: number;
      onViewableItemsChanged?: (info: {
        viewableItems: { isViewable: boolean; item: number; index: number | null }[];
      }) => void;
      renderItem: (info: { item: number; index: number }) => ReactNode;
    };
    lastInitialScrollIndex = initialScrollIndex;
    viewableHandler = onViewableItemsChanged;
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

jest.mock('@/features/reader/mushaf/fonts', () => ({
  revalidatePageFonts: () => Promise.resolve(),
  setMushafFontViewport: () => undefined,
}));

// The list sizes its page from the side insets; a portrait phone has none.
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
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

function mushafList(verseKey: string) {
  return (
    <ThemeProvider name="light">
      <MushafList anchorVerseKey={verseKey} onSwitchToReading={() => undefined} testID="mushaf" />
    </ThemeProvider>
  );
}

describe('MushafList', () => {
  beforeEach(() => {
    mockScrollToIndex.mockClear();
    lastInitialScrollIndex = undefined;
    viewableHandler = undefined;
  });

  it('opens on the mushaf page for 2:255 without snapping', async () => {
    const page = pageForVerse(mockTestExecutor, '2:255');
    expect(page).toBeDefined();
    expect(mushafPageIndexForVerseKey(mockTestExecutor, '2:255')).toBe((page ?? 1) - 1);

    await render(mushafList('2:255'));

    expect(lastInitialScrollIndex).toBe(mushafPageIndexForVerseKey(mockTestExecutor, '2:255'));
    expect(mockScrollToIndex).not.toHaveBeenCalled();
  });

  it('stays where the finger stopped when the next page becomes current', async () => {
    const view = await render(mushafList('1:1'));
    const nextKey = verseKeyForMushafPage(mockTestExecutor, 2);
    expect(nextKey).toEqual(expect.any(String));
    mockScrollToIndex.mockClear();

    viewableHandler?.({ viewableItems: [{ index: 1, isViewable: true, item: 2 }] });
    view.rerender(mushafList(nextKey!));

    expect(mockScrollToIndex).not.toHaveBeenCalled();
  });

  it('scrolls when the anchor moves to a different page', async () => {
    const view = await render(mushafList('1:1'));
    mockScrollToIndex.mockClear();

    view.rerender(mushafList('2:255'));

    await waitFor(() => {
      expect(mockScrollToIndex).toHaveBeenCalledWith({
        animated: false,
        index: mushafPageIndexForVerseKey(mockTestExecutor, '2:255'),
      });
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
