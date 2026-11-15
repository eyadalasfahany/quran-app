import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { gzipSync } from 'fflate';
import { useReducedMotion } from 'react-native-reanimated';
import type { SvgMushafPackReader } from '@/core/mushaf-pack';
import { ThemeProvider, themes } from '@/core/theme';
import { renderUi } from '../../../jest/render-ui';
import { resetSkiaCalls, skiaCalls } from '../../../jest/skia-mock';
import { MushafSvgList, type MushafSvgListProps } from './MushafSvgList';
import { MUSHAF_FRAME_SIDE, pageHeightFor, pageWidthFor, scaleFor } from './mushaf-svg/page-layout';

jest.mock('@shopify/react-native-skia', () => jest.requireActual('../../../jest/skia-mock'));

jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { ScrollView } = jest.requireActual<typeof import('react-native')>('react-native');
  const FlashList = React.forwardRef(
    (
      { data, renderItem, ...rest }: { data?: number[]; renderItem: (info: { item: number; index: number }) => React.ReactNode },
      ref: React.Ref<unknown>,
    ) => {
      React.useEffect(() => {
        mockList.props = rest;
      });
      React.useImperativeHandle(ref, () => ({
        getAbsoluteLastScrollOffset: () => mockList.currentOffset,
        getFirstItemOffset: () => 0,
        getLayout: (index: number) => ({ height: mockList.itemHeight, width: 0, x: 0, y: index * mockList.itemHeight }),
        scrollToIndex: (options: { index: number; viewOffset?: number; animated?: boolean }) => {
          mockList.indexCalls.push(options);
          return Promise.resolve();
        },
        scrollToOffset: (options: { offset: number; animated?: boolean }) => {
          mockList.offsetCalls.push(options);
        },
      }));
      return (
        <ScrollView {...rest}>
          {data?.map((item, index) => (
            <ScrollView key={item}>{renderItem({ index, item })}</ScrollView>
          ))}
        </ScrollView>
      );
    },
  );
  FlashList.displayName = 'FlashList';
  return { FlashList };
});

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ fontScale: 1, height: 844, scale: 1, width: mockWidth.value }),
}));

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { ...actual, __esModule: true, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

jest.mock('@/core/db/content/open', () => ({ openContentDb: () => ({ db: {}, executor: {} }) }));

jest.mock('./data/verses', () => ({
  getVerseByKey: (_db: unknown, key: string) => ({ id: 1, juz: 3, page: 11, textUthmani: 'نص تجريبي', verseKey: key }),
  idToVerseKey: (_db: unknown, id: number) => `2:${id}`,
}));

jest.mock('./data/chapters', () => ({
  chapterDisplayName: (chapter: { nameArabic: string }) => chapter.nameArabic,
  getChapter: () => ({ id: 2, nameArabic: 'اسم تجريبي', nameSimple: 'Test', versesCount: 3 }),
}));

const mockList: {
  props: Record<string, (...args: unknown[]) => void>;
  currentOffset: number;
  itemHeight: number;
  indexCalls: { index: number; viewOffset?: number; animated?: boolean }[];
  offsetCalls: { offset: number; animated?: boolean }[];
} = { currentOffset: 0, indexCalls: [], itemHeight: 600, offsetCalls: [], props: {} };

const mockWidth = { value: 390 };


// Content lookups are stubs: placeholder text, and a verse row whose `page` (11) must never decide the page.





// Placeholder pack: each page is a tiny synthetic SVG; the regions are placeholder rectangles in page units.
const svg = (tag: string) =>
  `<svg viewBox="0 0 345 550"><g transform="matrix(1 0 0 -1 0 550)"><g id="content"><g transform="translate(0 0)"><path d="${tag}"/></g></g></g></svg>`;
const good = (page: number) => gzipSync(new TextEncoder().encode(svg(`M ${page} 0 Z`)));
const RECT = (y0: number, y1: number) => `M 0 ${y0} L 100 ${y0} L 100 ${y1} L 0 ${y1} Z`;

const pageState = { boxes: [] as { ayah: number; line: number; position: number; surah: number; x0: number; x1: number; y0: number; y1: number }[], corrupt: new Set<number>() };

function fakeReader(): SvgMushafPackReader {
  return {
    firstAyahOnPage: (page: number) => (page === 12 ? { ayah: 1, surah: 2 } : page === 13 ? { ayah: 2, surah: 2 } : { ayah: 1, surah: 1 }),
    getPage: (page: number) => (pageState.corrupt.has(page) ? new Uint8Array([1, 2, 3]) : good(page)),
    pageCount: 604,
    pageForAyah: (surah: number, ayah: number) => (surah === 2 && (ayah === 1 || ayah === 2) ? 12 : surah === 1 && ayah === 1 ? 1 : null),
    regionsForPage: (page: number) =>
      page === 12
        ? [
            { ayah: 1, labelX: 1, labelY: 1, polygon: RECT(0, 10), surah: 2 },
            { ayah: 2, labelX: 1, labelY: 1, polygon: RECT(20, 30), surah: 2 },
          ]
        : [{ ayah: 1, labelX: 1, labelY: 1, polygon: RECT(0, 10), surah: 1 }],
    wordBoxesForPage: () => pageState.boxes,
  } as unknown as SvgMushafPackReader;
}

const artworkTop = (width: number) => mockList.itemHeight - pageHeightFor(width) - MUSHAF_FRAME_SIDE;

function list(overrides: Partial<MushafSvgListProps> = {}) {
  return (
    <MushafSvgList
      anchorVerseKey="2:1"
      mushafKey="hafs"
      onOpenAyahActions={jest.fn()}
      onSelectVerseKey={jest.fn()}
      reader={fakeReader()}
      testID="list"
      {...overrides}
    />
  );
}

beforeEach(() => {
  mockList.currentOffset = 0;
  mockList.indexCalls.length = 0;
  mockList.offsetCalls.length = 0;
  mockList.itemHeight = 600;
  mockWidth.value = 390;
  pageState.boxes = [];
  pageState.corrupt = new Set();
  jest.mocked(useReducedMotion).mockReturnValue(false);
  // Idle slots run at once in these tests, so a page is loaded as soon as it is asked for.
  globalThis.requestIdleCallback = ((task: () => void) => {
    task();
    return 0;
  }) as unknown as typeof requestIdleCallback;
  resetSkiaCalls();
});

describe('MushafSvgList', () => {
  it('opens on the page the pack says the anchor ayah starts on, and draws the pages around it', async () => {
    await renderUi(list({ anchorVerseKey: '2:2' }));
    expect(screen.getByTestId('list-page-12')).toBeTruthy();
    expect(screen.queryByTestId('list-page-11')).toBeNull();
    // The content's page (11) never decides the page: the divider of page 12 carries the pack's juz and page.
    expect(screen.getByTestId('list-break-12')).toBeTruthy();
    expect(screen.queryByTestId('list-break-1')).toBeNull();
  });

  it('scrolls the anchor line to the top of the screen: the artwork top plus the line inside the page', async () => {
    await renderUi(list({ anchorVerseKey: '2:2' }));
    await waitFor(() => expect(mockList.indexCalls.length).toBeGreaterThan(0));
    const scale = scaleFor(pageWidthFor(390, 2 * 16 + 2 * MUSHAF_FRAME_SIDE));
    expect(mockList.indexCalls[0]).toEqual({ animated: false, index: 0, viewOffset: artworkTop(pageWidthFor(390, 2 * 16 + 2 * MUSHAF_FRAME_SIDE)) + 20 * scale });
  });

  it('scrolls a surah start to the page top', async () => {
    await renderUi(list({ anchorVerseKey: '2:1' }));
    await waitFor(() => expect(mockList.indexCalls.length).toBeGreaterThan(0));
    expect(mockList.indexCalls[0]!.viewOffset).toBeCloseTo(artworkTop(pageWidthFor(390, 2 * 16 + 2 * MUSHAF_FRAME_SIDE)), 6);
  });

  it('reports the top ayah after a hand scroll ends, and ignores a programmatic scroll', async () => {
    const onTopAyah = jest.fn();
    await renderUi(list({ anchorVerseKey: '2:1', onTopAyah }));
    await waitFor(() => expect(mockList.indexCalls.length).toBeGreaterThan(0));
    const width = pageWidthFor(390, 2 * 16 + 2 * MUSHAF_FRAME_SIDE);
    // Right after the anchor scroll, the report is still the list's own scroll.
    mockList.currentOffset = artworkTop(width) + 15 * scaleFor(width);
    await act(async () => {
      mockList.props.onScrollEndDrag?.();
    });
    expect(onTopAyah).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await act(async () => {
      mockList.props.onScrollEndDrag?.();
    });
    // 15 page units down: the first line at or below it is ayah 2 (20 to 30).
    expect(onTopAyah).toHaveBeenLastCalledWith(12, '2:2');
  });

  it('follows the recited word off the comfort band with a capped scroll, animated unless Reduce Motion', async () => {
    const width = pageWidthFor(390, 2 * 16 + 2 * MUSHAF_FRAME_SIDE);
    const scale = scaleFor(width);
    pageState.boxes = [{ ayah: 1, line: 1, position: 1, surah: 2, x0: 0, x1: 10, y0: 700, y1: 710 }];
    await renderUi(list({ anchorVerseKey: '2:1', followKey: '2:1', recitedVerseKey: '2:1', recitedWord: 1 }));
    await waitFor(() => expect(mockList.offsetCalls.length).toBeGreaterThan(0));
    const lineTop = artworkTop(width) + 700 * scale;
    const fallback = 844;
    expect(mockList.offsetCalls[0]!.offset).toBeCloseTo(lineTop - fallback / 3, 4);
    expect(mockList.offsetCalls[0]!.animated).toBe(true);
  });

  it('does not scroll the follow when the line is inside the comfort band, nor when not following', async () => {
    pageState.boxes = [{ ayah: 1, line: 1, position: 1, surah: 2, x0: 0, x1: 10, y0: 100, y1: 110 }];
    await renderUi(list({ anchorVerseKey: '2:1', followKey: '2:1', recitedVerseKey: '2:1', recitedWord: 1 }));
    await waitFor(() => expect(mockList.indexCalls.length).toBeGreaterThan(0));
    expect(mockList.offsetCalls).toHaveLength(0);
    pageState.boxes = [{ ayah: 1, line: 1, position: 1, surah: 2, x0: 0, x1: 10, y0: 700, y1: 710 }];
    await renderUi(list({ anchorVerseKey: '2:1', followKey: null, recitedVerseKey: '2:1', recitedWord: 1 }));
    expect(mockList.offsetCalls).toHaveLength(0);
  });

  it('under Reduce Motion, the follow scroll is not animated', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    pageState.boxes = [{ ayah: 1, line: 1, position: 1, surah: 2, x0: 0, x1: 10, y0: 700, y1: 710 }];
    await renderUi(list({ anchorVerseKey: '2:1', followKey: '2:1', recitedVerseKey: '2:1', recitedWord: 1 }));
    await waitFor(() => expect(mockList.offsetCalls.length).toBeGreaterThan(0));
    expect(mockList.offsetCalls[0]!.animated).toBe(false);
  });

  it('a tap forwards the ayah it hit, and a long press opens its actions', async () => {
    const onSelectVerseKey = jest.fn();
    const onOpenAyahActions = jest.fn();
    await renderUi(list({ anchorVerseKey: '2:1', onOpenAyahActions, onSelectVerseKey }));
    const width = pageWidthFor(390, 2 * 16 + 2 * MUSHAF_FRAME_SIDE);
    const target = screen.getByTestId('list-page-12-press');
    await act(async () => {
      fireEvent(target, 'press', { nativeEvent: { locationX: 40, locationY: 5 / scaleFor(width) } });
    });
    expect(onSelectVerseKey).toHaveBeenCalledWith('2:1');
    await act(async () => {
      fireEvent(target, 'longPress', { nativeEvent: { locationX: 40, locationY: 25 / scaleFor(width) } });
    });
    expect(onOpenAyahActions).toHaveBeenCalledWith('2:2');
  });

  it('a page that cannot be loaded shows its error row, and retry loads it again', async () => {
    pageState.corrupt.add(13);
    await renderUi(list({ anchorVerseKey: '2:1' }));
    expect(screen.getByTestId('list-error-13')).toBeTruthy();
    pageState.corrupt.delete(13);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    });
    await waitFor(() => expect(screen.queryByTestId('list-error-13')).toBeNull());
    expect(screen.getByTestId('list-page-13')).toBeTruthy();
  });

  it('a non-Hafs mushaf draws no marks: the verse ids of another print never land on its ayahs', async () => {
    await renderUi(
      list({ anchorVerseKey: '2:1', highlightsByVerseId: new Map([[1, 'rose']]), mushafKey: 'warsh', recitedVerseKey: '2:1', recitedWord: null }),
    );
    // Only the recited ayah's wash is drawn; the rose mark of verse id 1 is not.
    const colours = skiaCalls.filter((call) => call.op === 'Path').map((call) => call.color);
    expect(colours).not.toContain(themes.light.colors.highlightRose);
    expect(colours.every((colour) => colour === themes.light.colors.highlightActive)).toBe(true);
  });

  it('lays a page out in Arabic and English at the same size, centred in the window', async () => {
    mockWidth.value = 1024;
    resetSkiaCalls();
    await renderUi(list({ anchorVerseKey: '2:1' }), { locale: 'en' });
    const english = skiaCalls.find((call) => call.op === 'Group' && call.transform !== undefined)?.transform;
    resetSkiaCalls();
    await renderUi(list({ anchorVerseKey: '2:1' }), { locale: 'ar' });
    const arabic = skiaCalls.find((call) => call.op === 'Group' && call.transform !== undefined)?.transform;
    expect(arabic).toBe(english);
    expect(arabic).toBe(JSON.stringify([{ scale: 600 / 345 }]));
  });

  it('re-anchors on the same ayah when the window size changes, without animating', async () => {
    const view = await renderUi(list({ anchorVerseKey: '2:2' }));
    await waitFor(() => expect(mockList.indexCalls.length).toBeGreaterThan(0));
    mockWidth.value = 1024;
    // The same tree (the theme provider kept), so the list keeps its state and only its width changes.
    await act(async () => view.rerender(<ThemeProvider name="light">{list({ anchorVerseKey: '2:2' })}</ThemeProvider>));
    await waitFor(() => expect(mockList.indexCalls.length).toBeGreaterThan(1));
    expect(mockList.indexCalls[mockList.indexCalls.length - 1]!.animated).toBe(false);
  });

  it('the page width is 358 on a 390 window (no frame) and 600 on a 1024 window', () => {
    expect(pageWidthFor(390, 2 * 16 + 2 * MUSHAF_FRAME_SIDE)).toBeCloseTo(358, 5);
    expect(pageWidthFor(1024, 2 * 16 + 2 * MUSHAF_FRAME_SIDE)).toBe(600);
  });
});
