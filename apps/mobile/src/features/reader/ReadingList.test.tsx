import { act, fireEvent, waitFor } from '@testing-library/react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { ThemeProvider, themes } from '@/core/theme';
import type { HighlightColor } from '@/features/library/data/model';

import { openReaderTestContent } from '../../../jest/reader-test-db';
import { flatStyle, renderUi } from '../../../jest/render-ui';
import { getVerseByKey, getVerseRange } from './data/verses';
import { ReadingList } from './ReadingList';
import type { ReadingRow } from './reading-list-types';
import { resolveCenterId, verseWindowBounds } from './reading-window';
import { FOLLOW_VIEW_POSITION, recitedWordOffset } from './word-follow';
import { measureWithin } from './measure-within';
import { WORD_SETTLE_MS } from './useWordFollow';

// The list sizes its column from the side insets; a portrait phone has none.
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

type TestNode = NonNullable<Awaited<ReturnType<typeof renderUi>>['root']>;

type FlashListTestState = {
  scrollCalls: { index: number; animated?: boolean }[];
  offsetCalls: { offset: number; animated?: boolean }[];
  currentOffset: number;
  /** The followed row's layout y (FlashList's, without the first item offset) and the first item offset. */
  layoutY: number;
  firstItemOffset: number;
  /** What scrollToIndex returns: FlashList's promise, which resolves when its steps finish. */
  scrollResult: Promise<void> | undefined;
  lastData: ReadingRow[] | undefined;
  lastExtraData: unknown;
  onViewableItemsChanged:
    | ((info: { viewableItems: { item: unknown; index: number; isViewable: boolean; key: string }[] }) => void)
    | undefined;
};

const flashListTestState: FlashListTestState = {
  scrollCalls: [],
  offsetCalls: [],
  currentOffset: 0,
  layoutY: 0,
  firstItemOffset: 0,
  scrollResult: undefined,
  lastData: undefined,
  lastExtraData: undefined,
  onViewableItemsChanged: undefined,
};

jest.mock('@shopify/flash-list', () => {
  // jest.mock factories run before imports are hoisted, so they must require.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- the mock reads the test's shared state lazily.
      const state = require('./ReadingList.test').flashListTestState as FlashListTestState;

      state.lastData = data;
      state.lastExtraData = extraData;
      state.onViewableItemsChanged = onViewableItemsChanged;

      React.useImperativeHandle(ref, () => ({
        getAbsoluteLastScrollOffset: () => state.currentOffset,
        getFirstItemOffset: () => state.firstItemOffset,
        getLayout: () => ({ height: 0, width: 0, x: 0, y: state.layoutY }),
        scrollToIndex: (options: { index: number; animated?: boolean }) => {
          state.scrollCalls.push(options);
          return state.scrollResult;
        },
        scrollToOffset: (options: { offset: number; animated?: boolean }) => {
          state.offsetCalls.push(options);
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

// The native measurement of the followed Text inside its row: each word-follow test sets where the Text sits.
jest.mock('./measure-within', () => ({ measureWithin: jest.fn() }));

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
  flashListTestState.offsetCalls.length = 0;
  flashListTestState.currentOffset = 0;
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
  it('shows inline tafsir under ayahs when inline mode is on', async () => {
    const view = await renderUi(
      <ReadingList
        anchorVerseKey="18:10"
        mode="reading"
        onOpenAyahActions={() => undefined}
        onSelectVerseKey={() => undefined}
        showInlineTafsir
        tafsirId={null}
        testID="list"
      />,
    );

    await waitFor(() => {
      expect(view.getAllByTestId(/^list-inline-tafsir-/).length).toBeGreaterThan(0);
    });
  });

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

  // FlashList repaints rows only when extraData changes, so the list must hand it the colours.
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
});

describe('ReadingList recitation follow', () => {
  function list(props: Partial<React.ComponentProps<typeof ReadingList>>) {
    return (
      <ThemeProvider name="light">
        <ReadingList
          anchorVerseKey="18:10"
          mode="reading"
          onOpenAyahActions={() => undefined}
          onSelectVerseKey={() => undefined}
          testID="list"
          {...props}
        />
      </ThemeProvider>
    );
  }

  it('brings the followed ayah to a third of the way down, animated', async () => {
    flashListTestState.scrollCalls.length = 0;
    const view = await renderUi(list({}));
    const index = ayahRowIndex('18:12');
    flashListTestState.scrollCalls.length = 0;

    view.rerender(list({ followKey: '18:12' }));

    await waitFor(() => {
      expect(flashListTestState.scrollCalls).toContainEqual(
        expect.objectContaining({ animated: true, index, viewPosition: 1 / 3 }),
      );
    });
  });

  it('does not jump back to the recited ayah when the follow pauses at the drag', async () => {
    flashListTestState.scrollCalls.length = 0;
    const view = await renderUi(list({ anchorVerseKey: '18:12', followKey: '18:12', recitedVerseKey: '18:12' }));
    flashListTestState.scrollCalls.length = 0;

    // The anchor is the recited ayah already; a drag ends the follow and nothing re-scrolls the list.
    view.rerender(list({ anchorVerseKey: '18:12', followKey: null, recitedVerseKey: '18:12' }));

    expect(flashListTestState.scrollCalls).toEqual([]);
  });

  it('scrolls once per recited ayah, not again when the window extends', async () => {
    const view = await renderUi(list({ followKey: '18:12', recitedVerseKey: '18:12' }));
    await waitFor(() => {
      expect(flashListTestState.scrollCalls).toContainEqual(expect.objectContaining({ viewPosition: 1 / 3 }));
    });
    flashListTestState.scrollCalls.length = 0;

    await fireEvent(view.getByLabelText('extend-end'), 'touchEnd');
    await fireEvent(view.getByLabelText('extend-start'), 'touchEnd');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(flashListTestState.scrollCalls).toEqual([]);
  });

  it('scrolls again when the follow resumes on the same ayah', async () => {
    const view = await renderUi(list({ followKey: '18:12', recitedVerseKey: '18:12' }));
    await view.rerender(list({ followKey: null, recitedVerseKey: '18:12' }));
    flashListTestState.scrollCalls.length = 0;

    await view.rerender(list({ followKey: '18:12', recitedVerseKey: '18:12' }));

    await waitFor(() => {
      expect(flashListTestState.scrollCalls).toContainEqual(expect.objectContaining({ viewPosition: 1 / 3 }));
    });
  });

  it('does not scroll when no ayah is followed (paused, or idle)', async () => {
    flashListTestState.scrollCalls.length = 0;
    const view = await renderUi(list({}));
    flashListTestState.scrollCalls.length = 0;

    view.rerender(list({ followKey: null, recitedVerseKey: '18:12' }));

    expect(flashListTestState.scrollCalls).toEqual([]);
  });

  it('marks the recited row with the recited hint', async () => {
    const view = await renderUi(list({ recitedVerseKey: '18:10' }));
    const recited = view.getAllByRole('button').filter((button) => button.props.accessibilityHint === 'يُتلى الآن');
    expect(recited).toHaveLength(1);
    expect(recited[0]!.props.accessibilityLabel).toContain('الآية ١٠');
  });
});

describe('ReadingList word follow', () => {
  // The screen height the list measures (no layout event under Jest: the list falls back to the window).
  const viewportHeight = 844;
  const lineHeight = 50;

  afterEach(() => {
    jest.mocked(measureWithin).mockReset();
    flashListTestState.layoutY = 0;
    flashListTestState.firstItemOffset = 0;
    flashListTestState.currentOffset = 0;
    flashListTestState.scrollResult = undefined;
  });

  function followed(props: Partial<React.ComponentProps<typeof ReadingList>>) {
    return (
      <ThemeProvider name="light">
        <ReadingList
          activeWord={2}
          anchorVerseKey="18:12"
          followKey="18:12"
          mode="reading"
          onOpenAyahActions={() => undefined}
          onSelectVerseKey={() => undefined}
          recitedVerseKey="18:12"
          testID="list"
          {...props}
        />
      </ThemeProvider>
    );
  }

  // The host Text the recited row draws: the only Text in the list that reports its lines.
  function recitedTextNode(view: Awaited<ReturnType<typeof renderUi>>): TestNode | undefined {
    const visit = (node: TestNode): TestNode | undefined => {
      if ((node.type as unknown) === 'Text' && typeof node.props.onTextLayout === 'function') {
        return node;
      }
      for (const child of node.children) {
        const found = typeof child === 'object' ? visit(child) : undefined;
        if (found !== undefined) {
          return found;
        }
      }
      return undefined;
    };
    return view.root === null ? undefined : visit(view.root);
  }

  // Lays the recited ayah out in two lines, the recited word starting the second. The row is laid out at layout y
  // `layoutY` under a first item offset; the Text sits `textTopInRow` down the row, as the native measurement reports.
  async function layOutRecited({
    firstItemOffset = 0,
    layoutY,
    textTopInRow,
  }: {
    firstItemOffset?: number;
    layoutY: number;
    textTopInRow: number;
  }) {
    const verse = getVerseByKey(mockTestExecutor, '18:12');
    expect(verse).toBeDefined();
    const offset = recitedWordOffset(verse!.textUthmani, 2);
    expect(offset).not.toBeNull();
    flashListTestState.layoutY = layoutY;
    flashListTestState.firstItemOffset = firstItemOffset;
    jest.mocked(measureWithin).mockImplementation((_node, _container, onMeasured) => onMeasured(textTopInRow));
    const view = await renderUi(followed({}));
    const textNode = recitedTextNode(view);
    expect(textNode).toBeDefined();
    const lines = [
      { height: lineHeight, text: verse!.textUthmani.slice(0, offset!), y: 0 },
      { height: lineHeight, text: verse!.textUthmani.slice(offset!), y: lineHeight },
    ];
    await act(async () => {
      textNode!.props.onTextLayout({ nativeEvent: { lines } });
    });
  }

  // The follow of the recited ayah (its own animated scroll) settles first: the word check waits WORD_SETTLE_MS.
  it('scrolls to the recited word, measured from the row with its first item offset, when its line leaves the band', async () => {
    // The row's content top is 1000 + 36 = 1036. The Text sits 64 down the row, and the list has scrolled 400, so the
    // Text's top is at 1036 + 64 - 400 = 700 on screen. Its second line sits at 750, below the band (168.8 to 675.2).
    flashListTestState.currentOffset = 400;
    await layOutRecited({ firstItemOffset: 36, layoutY: 1000, textTopInRow: 64 });
    const lineY = 700 + lineHeight;
    await waitFor(() => {
      expect(flashListTestState.offsetCalls).toEqual([
        { animated: true, offset: 400 + (lineY - viewportHeight * FOLLOW_VIEW_POSITION) },
      ]);
    });
  });

  it('waits for the ayah scroll to finish before it follows the word', async () => {
    let finish: () => void = () => undefined;
    flashListTestState.scrollResult = new Promise<void>((resolve) => {
      finish = resolve;
    });
    flashListTestState.currentOffset = 400;
    await layOutRecited({ firstItemOffset: 36, layoutY: 1000, textTopInRow: 64 });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, WORD_SETTLE_MS * 2));
    });
    expect(flashListTestState.offsetCalls).toEqual([]);

    await act(async () => {
      finish();
    });

    const lineY = 700 + lineHeight;
    await waitFor(() => {
      expect(flashListTestState.offsetCalls).toEqual([
        { animated: true, offset: 400 + (lineY - viewportHeight * FOLLOW_VIEW_POSITION) },
      ]);
    });
  });

  it('lands a recited line far down a long list near the current offset, not far below', async () => {
    // A row 9000 down the content, the list scrolled to it (offset 8950): the Text sits 120 into the row. Its top is at
    // 9000 + 120 - 8950 = 170 on screen, its line at 220, inside the band: nothing moves.
    flashListTestState.currentOffset = 8950;
    await layOutRecited({ layoutY: 9000, textTopInRow: 120 });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, WORD_SETTLE_MS + 50));
    });
    expect(flashListTestState.offsetCalls).toEqual([]);
  });

  it('ignores a stale measurement far below the viewport', async () => {
    flashListTestState.currentOffset = 200;
    await layOutRecited({ layoutY: 90000, textTopInRow: 0 });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, WORD_SETTLE_MS + 50));
    });
    expect(flashListTestState.offsetCalls).toEqual([]);
  });

  it('does not scroll when the recited word is inside the band', async () => {
    flashListTestState.currentOffset = 0;
    await layOutRecited({ layoutY: 0, textTopInRow: 300 });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, WORD_SETTLE_MS + 50));
    });
    expect(flashListTestState.offsetCalls).toEqual([]);
  });

  it('does not follow the word once the reader has stopped following', async () => {
    const view = await renderUi(followed({ followKey: null }));
    // The pill keeps its own line handler on the Text (ADR 0039), so the Text still reports its lines; the follow
    // must scroll nothing with the reader stopped.
    const textNode = recitedTextNode(view);
    expect(textNode).toBeDefined();
    const verse = getVerseByKey(mockTestExecutor, '18:12');
    await act(async () => {
      textNode!.props.onTextLayout({ nativeEvent: { lines: [{ height: lineHeight, text: verse!.textUthmani, y: 0 }] } });
    });
    expect(flashListTestState.offsetCalls).toEqual([]);
  });
});
