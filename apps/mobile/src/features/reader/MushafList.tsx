import { FlashList, type FlashListRef, type ListRenderItemInfo } from '@shopify/flash-list';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { openContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { useTheme } from '@/core/theme';
import type { HighlightColor } from '@/features/library/data/model';
import { firstVerseOfPage, pageForVerse } from '@/features/reader/anchor/page';
import { MushafListPage } from '@/features/reader/components/MushafListPage';
import { listChapters } from '@/features/reader/data/chapters';
import { revalidatePageFonts, setMushafFontViewport } from '@/features/reader/mushaf/fonts';
import { mushafContentWidth, mushafPageHeight } from '@/features/reader/mushaf/page-metrics';

export type MushafListProps = {
  anchorVerseKey: string;
  horizontalGutter?: number;
  topInset?: number;
  bottomInset?: number;
  selectedVerseId?: number | null;
  activeVerseId?: number | null;
  highlightsByVerseId?: ReadonlyMap<number, HighlightColor>;
  onVisiblePage?: (page: number, verseKey: string) => void;
  onSelectVerseId?: (verseId: number) => void;
  onOpenAyahActions?: (verseId: number) => void;
  onSwitchToReading?: (verseKey: string) => void;
  testID?: string;
};

const PAGE_NUMBERS = Array.from({ length: 604 }, (_, index) => index + 1);
const NO_HIGHLIGHTS: ReadonlyMap<number, HighlightColor> = new Map();

export function MushafList({
  anchorVerseKey,
  horizontalGutter = 0,
  topInset = 0,
  bottomInset = 0,
  selectedVerseId = null,
  activeVerseId = null,
  highlightsByVerseId = NO_HIGHLIGHTS,
  onVisiblePage,
  onSelectVerseId,
  onOpenAyahActions,
  onSwitchToReading,
  testID,
}: MushafListProps) {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = mushafContentWidth(windowWidth, horizontalGutter);
  const framePadding = theme.space[2];
  const pageHeight = mushafPageHeight(contentWidth, framePadding);
  const listRef = useRef<FlashListRef<number>>(null);
  const { executor } = useMemo(() => openContentDb(), []);
  const chapters = useMemo(() => listChapters(executor), [executor]);
  const chapterStartsByPage = useMemo(() => chaptersByStartPage(chapters), [chapters]);
  const initialPage = pageForVerse(executor, anchorVerseKey) ?? 1;
  const initialIndex = Math.max(0, initialPage - 1);
  const visiblePageRef = useRef(initialPage);

  useLayoutEffect(() => {
    const page = pageForVerse(executor, anchorVerseKey);
    if (page === undefined || page === visiblePageRef.current) {
      return;
    }
    visiblePageRef.current = page;
    listRef.current?.scrollToIndex({ animated: false, index: page - 1 });
  }, [anchorVerseKey, executor]);

  useEffect(() => {
    void revalidatePageFonts().catch(() => {});
  }, []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { isViewable: boolean; item: number; index: number | null }[] }) => {
      const viewable = viewableItems.filter(
        (token): token is { isViewable: boolean; item: number; index: number } =>
          token.isViewable && token.index !== null,
      );
      if (viewable.length === 0) {
        return;
      }
      const primary = viewable.reduce((best, token) => (token.index < best.index ? token : best));
      visiblePageRef.current = primary.item;
      setMushafFontViewport(primary.item);
      const verseKey = firstVerseOfPage(executor, primary.item);
      if (verseKey !== undefined) {
        onVisiblePage?.(primary.item, verseKey);
      }
    },
    [executor, onVisiblePage],
  );

  const overrideItemLayout = useCallback(
    (layout: { span?: number; size?: number }, _index: number) => {
      layout.size = pageHeight;
    },
    [pageHeight],
  );

  const renderPage = useCallback(
    ({ item: page }: ListRenderItemInfo<number>) => (
      <MushafListPage
        activeVerseId={activeVerseId}
        chapterStarts={chapterStartsByPage.get(page) ?? []}
        contentWidth={contentWidth}
        executor={executor}
        framePadding={framePadding}
        highlightsByVerseId={highlightsByVerseId}
        onOpenAyahActions={onOpenAyahActions}
        onSelectVerseId={onSelectVerseId}
        onSwitchToReading={onSwitchToReading}
        page={page}
        selectedVerseId={selectedVerseId}
        testID={testID ? `${testID}-page-${page}` : undefined}
      />
    ),
    [
      activeVerseId,
      chapterStartsByPage,
      contentWidth,
      executor,
      framePadding,
      highlightsByVerseId,
      onOpenAyahActions,
      onSelectVerseId,
      onSwitchToReading,
      selectedVerseId,
      testID,
    ],
  );

  // FlashList repaints pages only when data or extraData changes; renderPage reads these three.
  const pageExtraData = useMemo(
    () => ({ activeVerseId, highlightsByVerseId, selectedVerseId }),
    [activeVerseId, highlightsByVerseId, selectedVerseId],
  );

  return (
    <View style={{ flex: 1, paddingTop: topInset, paddingBottom: bottomInset }} testID={testID}>
      <FlashList
        data={PAGE_NUMBERS}
        extraData={pageExtraData}
        initialScrollIndex={initialIndex}
        keyExtractor={(page) => String(page)}
        onViewableItemsChanged={onViewableItemsChanged}
        overrideItemLayout={overrideItemLayout}
        ref={listRef}
        renderItem={renderPage}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
      />
    </View>
  );
}

function chaptersByStartPage(chapters: ReturnType<typeof listChapters>): Map<number, ReturnType<typeof listChapters>> {
  const map = new Map<number, ReturnType<typeof listChapters>>();
  for (const chapter of chapters) {
    const bucket = map.get(chapter.pageStart) ?? [];
    bucket.push(chapter);
    map.set(chapter.pageStart, bucket);
  }
  return map;
}

export function mushafPageIndexForVerseKey(executor: SqlExecutor, verseKey: string): number {
  const page = pageForVerse(executor, verseKey);
  return page === undefined ? 0 : page - 1;
}

export function verseKeyForMushafPage(executor: SqlExecutor, page: number): string | undefined {
  return firstVerseOfPage(executor, page);
}
