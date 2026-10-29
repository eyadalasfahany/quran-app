import { FlashList, type FlashListRef, type ListRenderItemInfo } from '@shopify/flash-list';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { openContentDb } from '@/core/db/content/open';
import { useTheme } from '@/core/theme';
import { firstVerseOfPage, pageForVerse } from '@/features/reader/anchor/page';
import type { HighlightColor } from '@/shared/ui';

import { HafsPage } from './components/HafsPage';
import { listChapters } from './data/chapters';
import { paragraphOf, paragraphWordOffset } from './mushaf-paragraph';
import { extendPageWindow, pageWindowFrom, pagesIn, type PageWindow } from './page-window';
import { useWordFollow } from './useWordFollow';

// Longest the list waits for the opened page to measure before it settles anyway.
const SETTLE_MS = 1500;

export type HafsMushafListProps = {
  anchorVerseKey: string;
  fontScale?: number;
  topInset?: number;
  bottomInset?: number;
  // Bottom padding inside the scroll, so the last page line scrolls clear of the reader's mini player bar.
  contentBottomInset?: number;
  selectedVerseKey?: string | null;
  /** The ayah the player is reciting; it gets the recited wash and brand marker. */
  recitedVerseKey?: string | null;
  /** The recited word's 1-based position, marked inside the recited ayah. */
  recitedWord?: number | null;
  /** The ayah the reader follows (playing, not dragged away): the word follow-scroll keeps its line in view. */
  followKey?: string | null;
  highlightsByVerseId?: ReadonlyMap<number, HighlightColor>;
  onVisiblePage?: (page: number, verseKey: string) => void;
  onSelectVerseKey?: (verseKey: string) => void;
  onOpenAyahActions?: (verseKey: string) => void;
  /** A drag began or ended: the reader is scrolling by hand, so following pauses. */
  onUserScrollStart?: () => void;
  onUserScrollEnd?: () => void;
  testID?: string;
};

export function HafsMushafList({
  anchorVerseKey,
  fontScale = 1,
  topInset = 0,
  bottomInset = 0,
  contentBottomInset = 0,
  selectedVerseKey = null,
  recitedVerseKey = null,
  recitedWord = null,
  followKey = null,
  highlightsByVerseId,
  onVisiblePage,
  onSelectVerseKey,
  onOpenAyahActions,
  onUserScrollStart,
  onUserScrollEnd,
  testID,
}: HafsMushafListProps) {
  const theme = useTheme();
  const listRef = useRef<FlashListRef<number>>(null);
  const { executor } = useMemo(() => openContentDb(), []);
  const reduceMotion = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();
  const chapters = useMemo(() => new Map(listChapters(executor).map((chapter) => [chapter.id, chapter])), [executor]);
  const initialPage = pageForVerse(executor, anchorVerseKey) ?? 1;
  const visiblePageRef = useRef(initialPage);

  // The list starts at the opened page, so nothing above it has to be estimated: mushaf pages are far
  // taller than any first estimate, and a jump by estimate lands many pages away. Earlier pages are added
  // as the reader scrolls up, and the list keeps its place while they arrive.
  const [pageWindow, setPageWindow] = useState<PageWindow>(() => pageWindowFrom(initialPage));
  const pages = useMemo(() => pagesIn(pageWindow), [pageWindow]);

  // A surah can start halfway down its page. The ayah the reader opened at stays the focus until that page
  // has measured where the ayah's surah starts; the list then scrolls the rest of the way, and until then it
  // reports no visible page, so a page it passes can't become the saved place.
  const [focusVerseKey, setFocusVerseKey] = useState<string | null>(anchorVerseKey);
  const settlingRef = useRef(true);

  // Settled: visible pages count again, and the pages before the opened one are added (the list keeps its
  // place), so a surah that starts at the top of its page can still be scrolled back from.
  const settle = useCallback(() => {
    if (!settlingRef.current) {
      return;
    }
    settlingRef.current = false;
    setFocusVerseKey(null);
    setPageWindow((current) => extendPageWindow(current, 'start'));
  }, []);

  // If the opened page never measures (it failed to render), the list still settles.
  useEffect(() => {
    if (focusVerseKey === null) {
      return;
    }
    const timer = setTimeout(settle, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [focusVerseKey, settle]);

  useLayoutEffect(() => {
    const page = pageForVerse(executor, anchorVerseKey);
    if (page === undefined || page === visiblePageRef.current) {
      return;
    }
    visiblePageRef.current = page;
    settlingRef.current = true;
    setFocusVerseKey(anchorVerseKey);
    setPageWindow(pageWindowFrom(page));
    listRef.current?.scrollToOffset({ animated: false, offset: 0 });
  }, [anchorVerseKey, executor]);

  const scrollToFocus = useCallback(
    (page: number, offset: number) => {
      const index = page - pageWindow.from;
      // The page measures while the list is still laying out; a scroll in the same frame is overridden.
      // FlashList holds its position correction until a scroll finishes, so the earlier pages are added only
      // after it has: added during the scroll, they would push the opened page down out of view.
      requestAnimationFrame(() => {
        const list = listRef.current;
        const scrolled =
          offset > 0 && index >= 0 && list !== null
            ? list.scrollToIndex({ animated: false, index, viewOffset: offset })
            : Promise.resolve();
        void Promise.resolve(scrolled).then(() => requestAnimationFrame(settle));
      });
    },
    [pageWindow.from, settle],
  );
  const focusPage = focusVerseKey === null ? undefined : pageForVerse(executor, focusVerseKey);

  // The paragraph holding the followed ayah is what the word follow-scroll measures; the recited word's offset is
  // counted in that paragraph's text, as the page draws it.
  const followRun = useMemo(
    () => (followKey === null ? null : paragraphOf(executor, followKey)),
    [executor, followKey],
  );
  const word = useWordFollow({
    bottomInset: contentBottomInset,
    currentOffset: () =>
      typeof listRef.current?.getAbsoluteLastScrollOffset === 'function'
        ? listRef.current.getAbsoluteLastScrollOffset()
        : 0,
    fallbackHeight: Math.max(0, windowHeight - topInset - bottomInset),
    following: followKey !== null,
    offset:
      followRun !== null && followKey !== null && recitedWord !== null
        ? paragraphWordOffset(followRun, followKey, recitedWord)
        : null,
    reduceMotion,
    scrollTo: (offset, animated) => {
      if (typeof listRef.current?.scrollToOffset === 'function') {
        listRef.current.scrollToOffset({ animated, offset });
      }
    },
    textKey: followRun === null ? null : followRun[0].verseKey,
  });

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { isViewable: boolean; item: number; index: number | null }[] }) => {
      const viewable = viewableItems.filter(
        (token): token is { isViewable: boolean; item: number; index: number } =>
          token.isViewable && token.index !== null,
      );
      if (viewable.length === 0 || settlingRef.current) {
        return;
      }
      const primary = viewable.reduce((best, token) => (token.index < best.index ? token : best));
      visiblePageRef.current = primary.item;
      const verseKey = firstVerseOfPage(executor, primary.item);
      if (verseKey !== undefined) {
        onVisiblePage?.(primary.item, verseKey);
      }
    },
    [executor, onVisiblePage],
  );

  // FlashList repaints pages only when data or extraData changes; renderPage reads these from props.
  const pageExtraData = useMemo(
    () => ({ focusVerseKey, followKey, highlightsByVerseId, recitedVerseKey, recitedWord, selectedVerseKey }),
    [focusVerseKey, followKey, highlightsByVerseId, recitedVerseKey, recitedWord, selectedVerseKey],
  );

  const renderPage = useCallback(
    ({ item: page }: ListRenderItemInfo<number>) => (
      <HafsPage
        chapters={chapters}
        executor={executor}
        focusVerseKey={page === focusPage ? focusVerseKey : null}
        follow={word}
        followKey={followKey}
        fontScale={fontScale}
        highlightsByVerseId={highlightsByVerseId}
        onFocusOffset={scrollToFocus}
        onOpenAyahActions={onOpenAyahActions}
        onSelectVerseKey={onSelectVerseKey}
        page={page}
        recitedVerseKey={recitedVerseKey}
        recitedWord={recitedWord}
        selectedVerseKey={selectedVerseKey}
        testID={testID}
      />
    ),
    [
      chapters,
      executor,
      focusPage,
      focusVerseKey,
      followKey,
      fontScale,
      word,
      highlightsByVerseId,
      onOpenAyahActions,
      onSelectVerseKey,
      recitedVerseKey,
      recitedWord,
      scrollToFocus,
      selectedVerseKey,
      testID,
    ],
  );

  return (
    <View style={{ flex: 1, paddingBottom: bottomInset, paddingTop: topInset }} testID={testID}>
      <View {...word.viewportProps} style={{ flex: 1 }}>
        <FlashList
          contentContainerStyle={{ paddingBottom: contentBottomInset, paddingHorizontal: theme.space[4] }}
          data={pages}
          extraData={pageExtraData}
          keyExtractor={(page) => String(page)}
          maintainVisibleContentPosition={{}}
          onEndReached={() => setPageWindow((current) => extendPageWindow(current, 'end'))}
          onEndReachedThreshold={0.6}
          onMomentumScrollEnd={onUserScrollEnd}
          onScrollBeginDrag={onUserScrollStart}
          onScrollEndDrag={onUserScrollEnd}
          onStartReached={() => {
            if (!settlingRef.current) {
              setPageWindow((current) => extendPageWindow(current, 'start'));
            }
          }}
          onStartReachedThreshold={0.6}
          onViewableItemsChanged={onViewableItemsChanged}
          ref={listRef}
          renderItem={renderPage}
          viewabilityConfig={{ itemVisiblePercentThreshold: 20 }}
        />
      </View>
    </View>
  );
}
