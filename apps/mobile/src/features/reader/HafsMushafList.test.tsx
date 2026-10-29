import { act } from '@testing-library/react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { openReaderTestContent } from '../../../jest/reader-test-db';
import { renderUi } from '../../../jest/render-ui';
import { HafsMushafList } from './HafsMushafList';
import { paragraphOf, paragraphWordOffset } from './mushaf-paragraph';
import { measureInViewport } from './measure-in-viewport';
import { isWordToken } from './recited-text';
import { FOLLOW_VIEW_POSITION } from './word-follow';
import { ayahEndMarkText } from '@/shared/ui/AyahEndMark';

type TestNode = NonNullable<Awaited<ReturnType<typeof renderUi>>['root']>;

// The list's scroll calls are recorded; each page renders as its own row.
const mockListState = {
  currentOffset: 0,
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

// The native measurement of a paragraph inside the list viewport: each test sets where the paragraph sits.
jest.mock('./measure-in-viewport', () => ({ measureInViewport: jest.fn() }));

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
  jest.mocked(measureInViewport).mockReset();
  mockListState.offsetCalls.length = 0;
  mockListState.currentOffset = 0;
});

// The host Text the followed paragraph draws: the only Text in the list that reports its lines.
function followedTextNode(root: TestNode | null): TestNode | undefined {
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
  return root === null ? undefined : visit(root);
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
    mockListState.currentOffset = 300;

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
    const textNode = followedTextNode(view.root);
    expect(textNode).toBeDefined();

    // The paragraph is cut in two lines: the second starts at the recited word.
    const lines = [
      { height: lineHeight, text: paragraph.slice(0, offset!), y: 0 },
      { height: lineHeight, text: paragraph.slice(offset!), y: lineHeight },
    ];
    const textTop = 700;
    jest.mocked(measureInViewport).mockImplementation((_node, _viewport, onMeasured) => onMeasured(textTop));
    await act(async () => {
      textNode!.props.onTextLayout({ nativeEvent: { lines } });
    });
    // The ayah-level scroll (the list's own) settles before the word is checked.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    const lineY = textTop + lineHeight;
    expect(mockListState.offsetCalls).toEqual([
      { animated: true, offset: 300 + (lineY - viewportHeight * FOLLOW_VIEW_POSITION) },
    ]);
  });

  it('does not follow a word when no ayah is followed', async () => {
    const view = await renderUi(
      <HafsMushafList anchorVerseKey="2:255" followKey={null} testID="mushaf" topInset={0} />,
    );
    expect(followedTextNode(view.root)).toBeUndefined();
    expect(mockListState.offsetCalls).toEqual([]);
  });
});
