import { fireEvent, waitFor } from '@testing-library/react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { ThemeProvider, themes } from '@/core/theme';
import type { HighlightColor } from '@/features/library/data/model';

import { openReaderTestContent } from '../../../jest/reader-test-db';
import { flatStyle, renderUi } from '../../../jest/render-ui';
import { getVerseByKey, getVerseRange } from './data/verses';
import { ReadingList } from './ReadingList';
import type { ReadingRow } from './reading-list-types';
import { resolveCenterId, verseWindowBounds } from './reading-window';

type FlashListTestState = {
  scrollCalls: { index: number; animated?: boolean }[];
  lastData: ReadingRow[] | undefined;
  lastExtraData: unknown;
  onViewableItemsChanged:
    | ((info: { viewableItems: { item: unknown; index: number; isViewable: boolean; key: string }[] }) => void)
    | undefined;
};

const flashListTestState: FlashListTestState = {
  scrollCalls: [],
  lastData: undefined,
  lastExtraData: undefined,
  onViewableItemsChanged: undefined,
};

jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { ScrollView } = require('react-native');
  const FlashList = React.forwardRef(
    (
      {
        data,
        extraData,
        renderItem,
        onEndReached,
        onStartReached,
        onViewableItemsChanged,
        ...rest
      }: {
        data?: ReadingRow[];
        extraData?: unknown;
        renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
        onEndReached?: () => void;
        onStartReached?: () => void;
        onViewableItemsChanged?: (info: {
          viewableItems: { item: unknown; index: number; isViewable: boolean; key: string }[];
        }) => void;
      },
      ref: React.Ref<{ scrollToIndex: (options: { index: number; animated?: boolean }) => void }>,
    ) => {
      const state = require('./ReadingList.test').flashListTestState as FlashListTestState;

      state.lastData = data;
      state.lastExtraData = extraData;
      state.onViewableItemsChanged = onViewableItemsChanged;

      React.useImperativeHandle(ref, () => ({
        scrollToIndex: (options: { index: number; animated?: boolean }) => {
          state.scrollCalls.push(options);
        },
      }));
      return (
        <ScrollView {...rest}>
          {data?.map((item, index) => (
            <ScrollView key={index}>{renderItem({ item, index })}</ScrollView>
          ))}
          {onEndReached ? <ScrollView accessibilityLabel="extend-end" onTouchEnd={onEndReached} /> : null}
          {onStartReached ? <ScrollView accessibilityLabel="extend-start" onTouchEnd={onStartReached} /> : null}
        </ScrollView>
      );
    },
  );
  FlashList.displayName = 'FlashList';
  return { FlashList };
});

export { flashListTestState };

let mockTestExecutor: SqlExecutor;
const mockDimensions = { width: 390, height: 844 };

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockDimensions,
}));

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

beforeEach(() => {
  flashListTestState.scrollCalls.length = 0;
  flashListTestState.lastData = undefined;
  flashListTestState.lastExtraData = undefined;
  flashListTestState.onViewableItemsChanged = undefined;
});

function ayahRowIndex(verseKey: string): number {
  expect(flashListTestState.lastData).toBeDefined();
  const index = flashListTestState.lastData!.findIndex((row) => row.type === 'ayah' && row.verse.verseKey === verseKey);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

function simulateTopVisibleVerse(verseKey: string) {
  const index = ayahRowIndex(verseKey);
  const row = flashListTestState.lastData![index]!;
  const belowIndex = flashListTestState.lastData!.findIndex((r, i) => i > index && r.type === 'ayah');
  const viewableItems = [
    ...(belowIndex >= 0
      ? [{ item: flashListTestState.lastData![belowIndex]!, index: belowIndex, isViewable: true, key: `${belowIndex}` }]
      : []),
    { item: row, index, isViewable: true, key: `${index}` },
  ];
  flashListTestState.onViewableItemsChanged?.({ viewableItems });
}

describe('ReadingList', () => {
  it('renders around the anchor 18:10', async () => {
    const verse = getVerseByKey(mockTestExecutor, '18:10');
    expect(verse).toBeDefined();

    const view = await renderUi(
      <ReadingList anchorVerseKey="18:10" mode="reading" onOpenAyahActions={() => undefined} onSelectVerseKey={() => undefined} testID="list" />,
    );

    await waitFor(() => {
      expect(view.getByText(verse!.textUthmani)).toBeOnTheScreen();
    });
    expect(view.getByTestId('list-fade')).toBeOnTheScreen();
    expect(view.queryByTestId('reader-mode-fade')).toBeNull();
  });

  it('pads the end of the scroll by the content inset, so the last ayah clears the mini player', async () => {
    const view = await renderUi(
      <ReadingList
        anchorVerseKey="18:10"
        contentBottomInset={108}
        mode="reading"
        onOpenAyahActions={() => undefined}
        onSelectVerseKey={() => undefined}
        testID="list"
      />,
    );

    expect(flatStyle(view.getByTestId('list').props.contentContainerStyle)).toMatchObject({ paddingBottom: 108 });
  });

  it('adds no bottom content inset by default', async () => {
    const view = await renderUi(
      <ReadingList anchorVerseKey="18:10" mode="reading" onOpenAyahActions={() => undefined} onSelectVerseKey={() => undefined} testID="list" />,
    );

    expect(flatStyle(view.getByTestId('list').props.contentContainerStyle).paddingBottom).toBe(0);
  });

  it('starts below the floating toolbar and keeps the frame gutter', async () => {
    const view = await renderUi(
      <ReadingList
        anchorVerseKey="18:10"
        bottomInset={34}
        mode="reading"
        onOpenAyahActions={() => undefined}
        onSelectVerseKey={() => undefined}
        testID="list"
        topInset={123}
      />,
    );

    const list = view.getByTestId('list');
    let wrapper = list.parent;
    while (wrapper !== null && flatStyle(wrapper.props.style).paddingTop === undefined) {
      wrapper = wrapper.parent;
    }
    expect(flatStyle(wrapper?.props.style)).toMatchObject({ paddingBottom: 34, paddingTop: 123 });
    expect(flatStyle(list.props.contentContainerStyle).paddingHorizontal).toBe(20);
  });

  it('extends the window when the list reaches an edge', async () => {
    const view = await renderUi(
      <ReadingList anchorVerseKey="18:10" mode="reading" onOpenAyahActions={() => undefined} onSelectVerseKey={() => undefined} testID="list" />,
    );

    const far = getVerseByKey(mockTestExecutor, '18:10');
    expect(far).toBeDefined();
    await waitFor(() => {
      expect(view.getByText(far!.textUthmani)).toBeOnTheScreen();
    });

    const centerId = resolveCenterId(mockTestExecutor, '18:10');
    const { toId } = verseWindowBounds(centerId);
    const nextVerse = getVerseRange(mockTestExecutor, toId + 1, toId + 1)[0];
    expect(nextVerse).toBeDefined();
    expect(view.queryByText(nextVerse!.textUthmani)).toBeNull();

    fireEvent(view.getByLabelText('extend-end'), 'touchEnd');

    await waitFor(() => {
      expect(view.getByText(nextVerse!.textUthmani)).toBeOnTheScreen();
    });
  });

  it('restores the top ayah after the window width changes', async () => {
    const view = await renderUi(
      <ReadingList anchorVerseKey="18:10" mode="reading" onOpenAyahActions={() => undefined} onSelectVerseKey={() => undefined} testID="list" />,
    );

    const verse = getVerseByKey(mockTestExecutor, '18:10');
    await waitFor(() => {
      expect(view.getByText(verse!.textUthmani)).toBeOnTheScreen();
    });

    const anchorIndex = ayahRowIndex('18:10');
    flashListTestState.scrollCalls.length = 0;
    simulateTopVisibleVerse('18:10');

    mockDimensions.width = 820;
    view.rerender(
      <ThemeProvider name="light">
        <ReadingList anchorVerseKey="18:10" mode="reading" onOpenAyahActions={() => undefined} onSelectVerseKey={() => undefined} testID="list" />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(flashListTestState.scrollCalls.some((call) => call.index === anchorIndex)).toBe(true);
      expect(view.getByText(verse!.textUthmani)).toBeOnTheScreen();
    });

    mockDimensions.width = 390;
  });

  it('does not pin the ayah to the top when scrolling updates the anchor', async () => {
    const onVisibleVerseKey = jest.fn();
    const view = await renderUi(
      <ReadingList
        anchorVerseKey="18:10"
        mode="reading"
        onOpenAyahActions={() => undefined}
        onSelectVerseKey={() => undefined}
        onVisibleVerseKey={onVisibleVerseKey}
        testID="list"
      />,
    );

    const verse = getVerseByKey(mockTestExecutor, '18:12');
    await waitFor(() => {
      expect(view.getByText(verse!.textUthmani)).toBeOnTheScreen();
    });

    flashListTestState.scrollCalls.length = 0;
    simulateTopVisibleVerse('18:12');
    view.rerender(
      <ThemeProvider name="light">
        <ReadingList
          anchorVerseKey="18:12"
          mode="reading"
          onOpenAyahActions={() => undefined}
          onSelectVerseKey={() => undefined}
          onVisibleVerseKey={onVisibleVerseKey}
          testID="list"
        />
      </ThemeProvider>,
    );

    expect(onVisibleVerseKey).toHaveBeenCalledWith('18:12');
    expect(flashListTestState.scrollCalls).toEqual([]);
  });

  it('passes the verse key to the selection callback', async () => {
    const onSelectVerseKey = jest.fn();
    const view = await renderUi(
      <ReadingList
        anchorVerseKey="18:10"
        mode="reading"
        onOpenAyahActions={() => undefined}
        onSelectVerseKey={onSelectVerseKey}
        testID="list"
      />,
    );

    await waitFor(() => {
      expect(view.getByTestId('list-ayah-18:10')).toBeOnTheScreen();
    });

    fireEvent.press(view.getByTestId('list-ayah-18:10'));
    expect(onSelectVerseKey).toHaveBeenCalledWith('18:10');
  });

  // FlashList repaints rows only when extraData changes, so the list must hand it the colours and selection.
  it('repaints a row with its new colour when the highlights change', async () => {
    const verse = getVerseByKey(mockTestExecutor, '18:10');
    const list = (highlights: ReadonlyMap<number, HighlightColor>) => (
      <ReadingList
        anchorVerseKey="18:10"
        highlightsByVerseId={highlights}
        mode="reading"
        onOpenAyahActions={() => undefined}
        onSelectVerseKey={() => undefined}
        testID="list"
      />
    );
    const view = await renderUi(list(new Map()));
    await waitFor(() => {
      expect(view.getByText(verse!.textUthmani)).toBeOnTheScreen();
    });
    const before = flashListTestState.lastExtraData;

    view.rerender(<ThemeProvider name="light">{list(new Map([[verse!.id, 'green']]))}</ThemeProvider>);

    await waitFor(() => {
      expect(flashListTestState.lastExtraData).not.toBe(before);
      expect(flatStyle(view.getByText(verse!.textUthmani).parent!.props.style).backgroundColor).toBe(
        themes.light.colors.highlightGreen,
      );
    });
  });

  it('passes the selected ayah through extraData so the selection repaints', async () => {
    const list = (selectedVerseKey: string | null) => (
      <ReadingList
        anchorVerseKey="18:10"
        mode="reading"
        onOpenAyahActions={() => undefined}
        onSelectVerseKey={() => undefined}
        selectedVerseKey={selectedVerseKey}
        testID="list"
      />
    );
    const view = await renderUi(list(null));
    await waitFor(() => {
      expect(view.getByTestId('list-ayah-18:10')).toBeOnTheScreen();
    });

    view.rerender(<ThemeProvider name="light">{list('18:10')}</ThemeProvider>);

    await waitFor(() => {
      expect(flashListTestState.lastExtraData).toMatchObject({ selectedVerseKey: '18:10' });
    });
  });
});
