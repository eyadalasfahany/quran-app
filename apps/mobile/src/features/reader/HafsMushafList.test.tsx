import { act } from '@testing-library/react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { openReaderTestContent } from '../../../jest/reader-test-db';
import { renderUi } from '../../../jest/render-ui';
import { ThemeProvider } from '@/core/theme';
import { HafsMushafList } from './HafsMushafList';
import { paragraphOf, paragraphVerseRanges, paragraphWordOffset } from './mushaf-paragraph';
import { measureWithin } from './measure-within';
import { isWordToken } from './recited-text';
import { FOLLOW_VIEW_POSITION } from './word-follow';
import { firstVerseOfPage, pageForVerse } from '@/features/reader/anchor/page';
import { WORD_SETTLE_MS } from './useWordFollow';
import { ayahEndMarkText } from '@/shared/ui/AyahEndMark';

type TestNode = NonNullable<Awaited<ReturnType<typeof renderUi>>['root']>;

// The list's scroll calls are recorded; each page renders as its own row.
const mockListState = {
  currentOffset: 0,
  /** The followed page row's layout y (without the first item offset) and the first item offset. */
  layoutY: 0,
  firstItemOffset: 0,
  offsetCalls: [] as { offset: number; animated?: boolean }[],
};

jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { ScrollView } = jest.requireActual<typeof import('react-native')>('react-native');
  const FlashList = React.forwardRef(
    (
      {
        data,
        renderItem,
        ...rest
      }: { data?: number[]; renderItem: (info: { item: number; index: number }) => React.ReactNode },
      ref: React.Ref<unknown>,
    ) => {
      React.useImperativeHandle(ref, () => ({
        getAbsoluteLastScrollOffset: () => mockListState.currentOffset,
        getFirstItemOffset: () => mockListState.firstItemOffset,
        getLayout: () => ({ height: 0, width: 0, x: 0, y: mockListState.layoutY }),
        scrollToIndex: () => undefined,
        scrollToOffset: (options: { offset: number; animated?: boolean }) => {
          mockListState.offsetCalls.push(options);
        },
      }));
      return (
        <ScrollView {...rest}>
          {data?.map((item, index) => (
            <ScrollView key={item}>{renderItem({ item, index })}</ScrollView>
          ))}
        </ScrollView>
      );
    },
  );
  FlashList.displayName = 'FlashList';
  return { FlashList };
});

// The native measurement of the followed paragraph inside its page cell: each test sets where the paragraph sits.
jest.mock('./measure-within', () => ({ measureWithin: jest.fn() }));

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ fontScale: 1, height: 844, scale: 1, width: 390 }),
}));

let mockExecutor: SqlExecutor;

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => ({ db: {}, executor: mockExecutor }),
  useContentDb: () => ({ ready: true, error: null }),
}));

beforeAll(async () => {
  mockExecutor = (await openReaderTestContent()).executor;
});

afterEach(() => {
  jest.mocked(measureWithin).mockReset();
  mockListState.offsetCalls.length = 0;
  mockListState.currentOffset = 0;
  mockListState.layoutY = 0;
  mockListState.firstItemOffset = 0;
});

// The first node in the tree that matches, depth first.
function findNode(root: TestNode | null, matches: (node: TestNode) => boolean): TestNode | undefined {
  const visit = (node: TestNode): TestNode | undefined => {
    if (matches(node)) {
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
  return root === null ? undefined : visit(root);
}

// The host Text of the paragraph that starts with `firstKey`. Every paragraph reports its lines (ADR 0073), so a test
// names the one it lays out by its testID.
function paragraphNode(root: TestNode | null, firstKey: string): TestNode | undefined {
  return findNode(
    root,
    (node) =>
      (node.type as unknown) === 'Text' &&
      typeof node.props.testID === 'string' &&
      node.props.testID.endsWith(`-text-${firstKey}`) &&
      typeof node.props.onTextLayout === 'function',
  );
}

// The host Text the followed paragraph draws: the paragraph holding the followed ayah.
function followedTextNode(root: TestNode | null, followKey: string | null): TestNode | undefined {
  const firstKey = followKey === null ? undefined : paragraphOf(mockExecutor, followKey)?.[0]?.verseKey;
  return firstKey === undefined ? undefined : paragraphNode(root, firstKey);
}

describe('HafsMushafList word follow', () => {
  const viewportHeight = 844;
  const lineHeight = 50;

  it('scrolls to the recited word in its paragraph when its line leaves the band', async () => {
    // 2:255 is recited in its surah paragraph; the word is the fourth word of that ayah.
    const followKey = '2:255';
    const recitedWord = 4;
    const run = paragraphOf(mockExecutor, followKey)!;
    const offset = paragraphWordOffset(run, followKey, recitedWord);
    expect(offset).not.toBeNull();
    // The paragraph as the page draws it: each ayah, then its space and end mark, with a space before the next ayah.
    const paragraph = run
      .map((verse, index) => `${index > 0 ? ' ' : ''}${verse.textUthmani} ${ayahEndMarkText(verse.verseNumber)}`)
      .join('');
    // The fourth counted word of 2:255, as the offset must land on it.
    const word = run
      .find((verse) => verse.verseKey === followKey)!
      .textUthmani.split(' ')
      .filter(isWordToken)[recitedWord - 1];
    expect(paragraph.slice(offset!).startsWith(word!)).toBe(true);
    // The list is scrolled to the recited page: its row's content top is 1000 + 36, and the paragraph sits 64 into it.
    // On screen the paragraph's top is 1036 + 64 - 400 = 700.
    mockListState.currentOffset = 400;
    mockListState.layoutY = 1000;
    mockListState.firstItemOffset = 36;

    const view = await renderUi(
      <HafsMushafList
        anchorVerseKey={followKey}
        contentBottomInset={0}
        followKey={followKey}
        recitedVerseKey={followKey}
        recitedWord={recitedWord}
        testID="mushaf"
        topInset={0}
      />,
    );
    const textNode = followedTextNode(view.root, followKey);
    expect(textNode).toBeDefined();

    // The paragraph is cut in two lines: the second starts at the recited word.
    const lines = [
      { height: lineHeight, text: paragraph.slice(0, offset!), y: 0 },
      { height: lineHeight, text: paragraph.slice(offset!), y: lineHeight },
    ];
    const textTopInPage = 64;
    jest.mocked(measureWithin).mockImplementation((_node, _page, onMeasured) => onMeasured(textTopInPage));
    await act(async () => {
      textNode!.props.onTextLayout({ nativeEvent: { lines } });
    });
    // The ayah-level scroll (the list's own) settles before the word is checked.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    const lineY = 700 + lineHeight;
    expect(mockListState.offsetCalls).toEqual([
      { animated: true, offset: 400 + (lineY - viewportHeight * FOLLOW_VIEW_POSITION) },
    ]);
  });

  it('leaves a line inside the band of a tall page alone, far down the list', async () => {
    // The list is scrolled far down a tall page (offset 3950): the paragraph starts 4000 into the list and its line
    // sits 120 into the page cell, so on screen it is at 170, inside the band. Nothing moves.
    const followKey = '2:255';
    mockListState.currentOffset = 3950;
    mockListState.layoutY = 4000;
    jest.mocked(measureWithin).mockImplementation((_node, _page, onMeasured) => onMeasured(120));
    const view = await renderUi(
      <HafsMushafList anchorVerseKey={followKey} followKey={followKey} recitedWord={4} recitedVerseKey={followKey} testID="mushaf" topInset={0} />,
    );
    const textNode = followedTextNode(view.root, followKey)!;
    const run = paragraphOf(mockExecutor, followKey)!;
    const paragraph = run.map((verse) => verse.textUthmani).join(' ');
    await act(async () => {
      textNode.props.onTextLayout({ nativeEvent: { lines: [{ height: lineHeight, text: paragraph, y: 0 }] } });
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, WORD_SETTLE_MS + 50));
    });
    expect(mockListState.offsetCalls.filter((call) => call.animated === true)).toEqual([]);
  });

  it('waits for a page turn to settle before it checks the recited word', async () => {
    const fromKey = '2:255';
    const fromPage = pageForVerse(mockExecutor, fromKey)!;
    const toKey = firstVerseOfPage(mockExecutor, fromPage + 1)!;
    const recitedWord = 1;
    const toRun = paragraphOf(mockExecutor, toKey)!;
    const toParagraph = toRun.map((verse) => verse.textUthmani).join(' ');
    const toOffset = paragraphWordOffset(toRun, toKey, recitedWord)!;
    mockListState.currentOffset = 0;
    mockListState.layoutY = 0;
    jest.mocked(measureWithin).mockImplementation((_node, _page, onMeasured) => onMeasured(300));
    const view = await renderUi(
      <HafsMushafList anchorVerseKey={fromKey} followKey={fromKey} recitedWord={recitedWord} recitedVerseKey={fromKey} testID="mushaf" topInset={0} />,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, WORD_SETTLE_MS + 50));
    });

    // The reader turns to the next page as the recitation moves there. Its line is now below the band (700 on screen).
    mockListState.offsetCalls.length = 0;
    jest.mocked(measureWithin).mockImplementation((_node, _page, onMeasured) => onMeasured(700));
    await act(async () => {
      view.rerender(
        <HafsMushafList anchorVerseKey={toKey} followKey={toKey} recitedWord={recitedWord} recitedVerseKey={toKey} testID="mushaf" topInset={0} />,
      );
    });
    const textNode = followedTextNode(view.root, toKey)!;
    await act(async () => {
      textNode.props.onTextLayout({
        nativeEvent: {
          lines: [
            { height: lineHeight, text: toParagraph.slice(0, toOffset), y: 0 },
            { height: lineHeight, text: toParagraph.slice(toOffset), y: lineHeight },
          ],
        },
      });
    });
    // Right after the turn, no word scroll has run: the check waits for the page to settle.
    expect(mockListState.offsetCalls.filter((call) => call.animated === true)).toEqual([]);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, WORD_SETTLE_MS + 50));
    });
    expect(mockListState.offsetCalls.filter((call) => call.animated === true)).toEqual([
      { animated: true, offset: 0 + (750 - viewportHeight * FOLLOW_VIEW_POSITION) },
    ]);
  });

  it('does not follow a word when no ayah is followed', async () => {
    const view = await renderUi(
      <HafsMushafList anchorVerseKey="2:255" followKey={null} testID="mushaf" topInset={0} />,
    );
    expect(followedTextNode(view.root, null)).toBeUndefined();
    expect(mockListState.offsetCalls).toEqual([]);
  });
});

describe('HafsMushafList top ayah (ADR 0073)', () => {
  // The list settles after the opened page measures (SETTLE_MS, 1500 ms in the list); the test waits past it.
  const settleWaitMs = 1600;

  // Lays the list out at the opened ayah, and waits until it has settled.
  async function settledList(props: Partial<Parameters<typeof HafsMushafList>[0]> = {}) {
    const view = await renderUi(
      <HafsMushafList anchorVerseKey="2:255" testID="mushaf" topInset={0} {...props} />,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, settleWaitMs));
    });
    return view;
  }

  // The FlashList stand-in passes its scroll-end handlers to the scroll view it renders.
  function scrollEndHandler(root: TestNode | null, name: 'onMomentumScrollEnd' | 'onScrollEndDrag') {
    return findNode(root, (node) => typeof node.props[name] === 'function')?.props[name] as (() => void) | undefined;
  }

  beforeEach(() => {
    mockListState.currentOffset = 0;
    mockListState.layoutY = 0;
    mockListState.firstItemOffset = 0;
    // Every measured paragraph's text sits at the top of the viewport.
    jest.mocked(measureWithin).mockImplementation((_node, _root, onMeasured) => onMeasured(0));
  });

  it('reports the ayah whose line starts at the top of the screen once a scroll ends', async () => {
    const anchor = '2:255';
    const run = paragraphOf(mockExecutor, anchor)!;
    expect(run.length).toBeGreaterThan(1);
    const ranges = paragraphVerseRanges(run);
    // The first line sits above the top of the screen; the second starts in the second ayah and is fully visible.
    const lines = [
      { height: 50, text: 'x'.repeat(ranges[1]!.start), y: -100 },
      { height: 50, text: 'y', y: 0 },
    ];
    const onTopAyah = jest.fn();
    const view = await settledList({ onTopAyah });

    await act(async () => {
      paragraphNode(view.root, run[0]!.verseKey)!.props.onTextLayout({ nativeEvent: { lines } });
    });
    await act(async () => {
      scrollEndHandler(view.root, 'onScrollEndDrag')!();
    });

    const second = run[1]!.verseKey;
    expect(onTopAyah).toHaveBeenCalledTimes(1);
    expect(onTopAyah).toHaveBeenCalledWith(pageForVerse(mockExecutor, second), second);
  });

  it('reports the ayah on the momentum scroll end too', async () => {
    const anchor = '2:255';
    const run = paragraphOf(mockExecutor, anchor)!;
    const ranges = paragraphVerseRanges(run);
    const onTopAyah = jest.fn();
    const view = await settledList({ onTopAyah });

    await act(async () => {
      paragraphNode(view.root, run[0]!.verseKey)!.props.onTextLayout({
        nativeEvent: {
          lines: [
            { height: 50, text: 'x'.repeat(ranges[1]!.start), y: -100 },
            { height: 50, text: 'y', y: 0 },
          ],
        },
      });
    });
    await act(async () => {
      scrollEndHandler(view.root, 'onMomentumScrollEnd')!();
    });

    expect(onTopAyah).toHaveBeenCalledWith(pageForVerse(mockExecutor, run[1]!.verseKey), run[1]!.verseKey);
  });

  it('keeps the measured lines when the page re-renders before the scroll ends', async () => {
    const anchor = '2:255';
    const run = paragraphOf(mockExecutor, anchor)!;
    const ranges = paragraphVerseRanges(run);
    const onTopAyah = jest.fn();
    const lines = [
      { height: 50, text: 'x'.repeat(ranges[1]!.start), y: -100 },
      { height: 50, text: 'y', y: 0 },
    ];
    const view = await settledList({ onTopAyah });
    await act(async () => {
      paragraphNode(view.root, run[0]!.verseKey)!.props.onTextLayout({ nativeEvent: { lines } });
    });

    // A new highlight map re-renders the page: its ref callback runs with null, then with the node again.
    await act(async () => {
      view.rerender(
        <ThemeProvider name="light">
          <HafsMushafList anchorVerseKey={anchor} highlightsByVerseId={new Map()} onTopAyah={onTopAyah} testID="mushaf" topInset={0} />
        </ThemeProvider>,
      );
    });
    await act(async () => {
      scrollEndHandler(view.root, 'onScrollEndDrag')!();
    });

    expect(onTopAyah).toHaveBeenCalledWith(pageForVerse(mockExecutor, run[1]!.verseKey), run[1]!.verseKey);
  });

  it('clears the measured lines when the font scale changes, until the page measures again', async () => {
    const anchor = '2:255';
    const run = paragraphOf(mockExecutor, anchor)!;
    const ranges = paragraphVerseRanges(run);
    const page = pageForVerse(mockExecutor, anchor)!;
    const lines = [
      { height: 50, text: 'x'.repeat(ranges[1]!.start), y: -100 },
      { height: 50, text: 'y', y: 0 },
    ];
    const onTopAyah = jest.fn();
    const view = await settledList({ onTopAyah });
    await act(async () => {
      paragraphNode(view.root, run[0]!.verseKey)!.props.onTextLayout({ nativeEvent: { lines } });
    });

    await act(async () => {
      view.rerender(
        <ThemeProvider name="light">
          <HafsMushafList anchorVerseKey={anchor} fontScale={1.25} onTopAyah={onTopAyah} testID="mushaf" topInset={0} />
        </ThemeProvider>,
      );
    });
    await act(async () => {
      scrollEndHandler(view.root, 'onScrollEndDrag')!();
    });
    expect(onTopAyah).toHaveBeenLastCalledWith(page, firstVerseOfPage(mockExecutor, page));

    // The page lays out again at the new size and reports its lines; the top ayah is read from them.
    await act(async () => {
      paragraphNode(view.root, run[0]!.verseKey)!.props.onTextLayout({ nativeEvent: { lines } });
    });
    await act(async () => {
      scrollEndHandler(view.root, 'onScrollEndDrag')!();
    });
    expect(onTopAyah).toHaveBeenLastCalledWith(pageForVerse(mockExecutor, run[1]!.verseKey), run[1]!.verseKey);
  });

  it('falls back to the first ayah of the visible page when no line is measured', async () => {
    const page = pageForVerse(mockExecutor, '2:255')!;
    const onTopAyah = jest.fn();
    const view = await settledList({ onTopAyah });

    await act(async () => {
      scrollEndHandler(view.root, 'onScrollEndDrag')!();
    });

    expect(onTopAyah).toHaveBeenCalledWith(page, firstVerseOfPage(mockExecutor, page));
  });

  it('reports nothing while the opened page is still settling', async () => {
    const onTopAyah = jest.fn();
    const view = await renderUi(
      <HafsMushafList anchorVerseKey="2:255" onTopAyah={onTopAyah} testID="mushaf" topInset={0} />,
    );

    await act(async () => {
      scrollEndHandler(view.root, 'onScrollEndDrag')!();
    });

    expect(onTopAyah).not.toHaveBeenCalled();
  });
});
