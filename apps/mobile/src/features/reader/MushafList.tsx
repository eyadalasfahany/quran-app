import { FlashList, type FlashListRef, type ListRenderItemInfo } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { openContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { useTheme } from '@/core/theme';
import type { HighlightColor } from '@/features/library/data/model';
import { firstVerseOfPage, pageForVerse } from '@/features/reader/anchor/page';
import { MushafPage } from '@/features/reader/components/MushafPage';
import { MushafPagePlaceholder } from '@/features/reader/components/MushafPagePlaceholder';
import { listChapters } from '@/features/reader/data/chapters';
import { getMushafPage, isPageInstalled } from '@/features/reader/data/mushaf';
import { QCF_V2_MUSHAF_ID } from '@/features/reader/mushaf/constants';
import { revalidatePageFonts, setMushafFontViewport } from '@/features/reader/mushaf/fonts';
import { mushafContentWidth, mushafPageHeight } from '@/features/reader/mushaf/page-metrics';
import { useMushafPageFont } from '@/features/reader/mushaf/useMushafPageFont';

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

export function MushafList({
  anchorVerseKey,
  horizontalGutter = 0,
  topInset = 0,
  bottomInset = 0,
  selectedVerseId = null,
  activeVerseId = null,
  highlightsByVerseId = new Map(),
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

  const scrollToVerseKey = useCallback(
    (verseKey: string, animated = false) => {
      const page = pageForVerse(executor, verseKey);
      if (page === undefined) {
        return;
      }
      listRef.current?.scrollToIndex({ animated, index: page - 1 });
    },
    [executor],
  );

  useEffect(() => {
    scrollToVerseKey(anchorVerseKey, false);
  }, [anchorVerseKey, scrollToVerseKey]);

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

  return (
    <View style={{ flex: 1, paddingTop: topInset, paddingBottom: bottomInset }} testID={testID}>
      <FlashList
        data={PAGE_NUMBERS}
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

function MushafListPage({
  page,
  contentWidth,
  framePadding,
  executor,
  chapterStarts,
  selectedVerseId,
  activeVerseId,
  highlightsByVerseId,
  onSelectVerseId,
  onOpenAyahActions,
  onSwitchToReading,
  testID,
}: {
  page: number;
  contentWidth: number;
  framePadding: number;
  executor: SqlExecutor;
  chapterStarts: ReturnType<typeof listChapters>;
  selectedVerseId: number | null;
  activeVerseId: number | null;
  highlightsByVerseId: ReadonlyMap<number, HighlightColor>;
  onSelectVerseId?: (verseId: number) => void;
  onOpenAyahActions?: (verseId: number) => void;
  onSwitchToReading?: (verseKey: string) => void;
  testID?: string;
}) {
  const font = useMushafPageFont(page);
  const layoutInstalled = isPageInstalled(executor, QCF_V2_MUSHAF_ID, page);
  const lines = useMemo(
    () => (layoutInstalled ? getMushafPage(executor, QCF_V2_MUSHAF_ID, page) : []),
    [executor, layoutInstalled, page],
  );
  const chapterForVerse = useMemo(() => verseChapterLookup(executor, lines), [executor, lines]);
  const verseKey = firstVerseOfPage(executor, page) ?? '1:1';

  if (!layoutInstalled) {
    return (
      <View style={{ minHeight: mushafPageHeight(contentWidth, framePadding) }}>
        <MushafPagePlaceholder
          onSwitchToReading={onSwitchToReading ? () => onSwitchToReading(verseKey) : undefined}
          testID={testID ? `${testID}-placeholder` : undefined}
          variant="missing-layout"
        />
      </View>
    );
  }

  if (font.status === 'error') {
    return (
      <View style={{ minHeight: mushafPageHeight(contentWidth, framePadding) }}>
        <MushafPagePlaceholder
          onSwitchToReading={onSwitchToReading ? () => onSwitchToReading(verseKey) : undefined}
          testID={testID ? `${testID}-placeholder` : undefined}
        />
      </View>
    );
  }

  if (font.status === 'loading') {
    return <View style={{ minHeight: mushafPageHeight(contentWidth, framePadding) }} testID={testID ? `${testID}-loading` : undefined} />;
  }

  return (
    <View style={{ alignItems: 'center', minHeight: mushafPageHeight(contentWidth, framePadding), paddingVertical: framePadding }}>
      <MushafPage
        activeVerseId={activeVerseId}
        chapterForVerse={chapterForVerse}
        chapterStarts={chapterStarts}
        contentWidth={contentWidth}
        fontFamily={font.fontFamily}
        highlightByVerse={highlightsByVerseId}
        lines={lines}
        onVerseLongPress={onOpenAyahActions}
        onVersePress={onSelectVerseId}
        selectedVerseId={selectedVerseId}
        testID={testID}
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

function verseChapterLookup(executor: SqlExecutor, lines: ReturnType<typeof getMushafPage>): (verseId: number) => number | undefined {
  const cache = new Map<number, number>();
  for (const line of lines) {
    for (const word of line.words) {
      if (cache.has(word.verseId)) {
        continue;
      }
      const row = executor.get<{ chapterId: number }>('SELECT chapter_id AS chapterId FROM verses WHERE id = ?', [word.verseId]);
      if (row !== undefined) {
        cache.set(word.verseId, row.chapterId);
      }
    }
  }
  return (verseId: number) => cache.get(verseId);
}

export function mushafPageIndexForVerseKey(executor: SqlExecutor, verseKey: string): number {
  const page = pageForVerse(executor, verseKey);
  return page === undefined ? 0 : page - 1;
}

export function verseKeyForMushafPage(executor: SqlExecutor, page: number): string | undefined {
  return firstVerseOfPage(executor, page);
}
