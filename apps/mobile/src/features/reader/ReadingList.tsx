import {
  FlashList,
  type FlashListRef,
  type ListRenderItemInfo,
  type ViewToken,
} from '@shopify/flash-list';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { openContentDb } from '@/core/db/content/open';
import { useTheme } from '@/core/theme';
import type { HighlightColor } from '@/features/library/data/model';

import { BismillahLine } from './components/BismillahLine';
import { MeasuredRow } from './components/MeasuredRow';
import { ReaderModeFade } from './components/ReaderModeFade';
import { ReadingAyahRow } from './components/ReadingAyahRow';
import { SurahHeader } from './components/SurahHeader';
import { readingColumnWidth } from './layout';
import { estimateReadingRowHeight, heightCacheSignature, ReadingHeightCache } from './reading-heights';
import type { ReadingRow } from './reading-list-types';
import {
  anchorRowIndex,
  buildReadingRows,
  LAST_VERSE_ID,
  READING_WINDOW_EXTEND,
  resolveCenterId,
  verseKeyFromRow,
  verseWindowBounds,
} from './reading-window';

export type ReadingListProps = {
  // Focus mode renders FocusReader; this list only reads.
  mode?: 'reading';
  anchorVerseKey: string;
  fontScale?: number;
  selectedVerseKey?: string | null;
  recitedVerseKey?: string | null;
  highlightsByVerseId?: ReadonlyMap<number, HighlightColor>;
  horizontalGutter?: number;
  topInset?: number;
  bottomInset?: number;
  onSelectVerseKey: (verseKey: string) => void;
  onOpenAyahActions: (verseKey: string) => void;
  onOpenTafsir?: (verseKey: string) => void;
  onVisibleVerseKey?: (verseKey: string) => void;
  testID?: string;
};

export function ReadingList({
  anchorVerseKey,
  fontScale = 1,
  selectedVerseKey = null,
  recitedVerseKey = null,
  highlightsByVerseId = new Map(),
  horizontalGutter = 0,
  topInset = 0,
  bottomInset = 0,
  onSelectVerseKey,
  onOpenAyahActions,
  onOpenTafsir,
  onVisibleVerseKey,
  testID,
}: ReadingListProps) {
  const theme = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const columnWidth = readingColumnWidth(windowWidth, horizontalGutter);
  const listRef = useRef<FlashListRef<ReadingRow>>(null);
  const heightCache = useRef(new ReadingHeightCache());
  const topVerseKeyRef = useRef<string | null>(null);
  const [openedVerseKey, setOpenedVerseKey] = useState(anchorVerseKey);
  const [followedVerseKey, setFollowedVerseKey] = useState<string | null>(null);
  if (anchorVerseKey !== followedVerseKey && anchorVerseKey !== openedVerseKey) {
    setOpenedVerseKey(anchorVerseKey);
  }
  const openedVerseRef = useRef(openedVerseKey);
  const onVisibleRef = useRef(onVisibleVerseKey);
  useEffect(() => {
    onVisibleRef.current = onVisibleVerseKey;
  }, [onVisibleVerseKey]);

  const [startExtendCount, setStartExtendCount] = useState(0);
  const [endExtendCount, setEndExtendCount] = useState(0);

  const executor = useMemo(() => openContentDb().executor, []);
  const centerId = useMemo(() => resolveCenterId(executor, openedVerseKey), [executor, openedVerseKey]);

  const windowRange = useMemo(() => {
    const base = verseWindowBounds(centerId);
    return {
      fromId: Math.max(1, base.fromId - startExtendCount * READING_WINDOW_EXTEND),
      toId: Math.min(LAST_VERSE_ID, base.toId + endExtendCount * READING_WINDOW_EXTEND),
    };
  }, [centerId, endExtendCount, startExtendCount]);

  const signature = heightCacheSignature(columnWidth, fontScale, 'reading');
  useEffect(() => {
    heightCache.current.clearForSignature(signature);
  }, [signature]);

  const rows = useMemo(() => {
    return buildReadingRows(executor, windowRange.fromId, windowRange.toId);
  }, [executor, windowRange.fromId, windowRange.toId]);

  const viewportHeight = Math.max(320, windowHeight - topInset - bottomInset);

  useLayoutEffect(() => {
    const openedChanged = openedVerseRef.current !== openedVerseKey;
    openedVerseRef.current = openedVerseKey;
    // The screen echoes the ayah a scroll just revealed. Pinning that ayah to the
    // top is what made a small drag jump.
    if (!openedChanged && followedVerseKey !== null && anchorVerseKey === followedVerseKey) {
      return;
    }
    if (!openedChanged && followedVerseKey !== null && anchorVerseKey === openedVerseKey) {
      return;
    }
    const index = anchorRowIndex(rows, anchorVerseKey);
    if (index >= 0 && typeof listRef.current?.scrollToIndex === 'function') {
      topVerseKeyRef.current = anchorVerseKey;
      listRef.current.scrollToIndex({ animated: false, index });
    }
  }, [anchorVerseKey, followedVerseKey, openedVerseKey, rows]);

  const prevLayoutSignature = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (prevLayoutSignature.current === null) {
      prevLayoutSignature.current = signature;
      return;
    }
    if (prevLayoutSignature.current === signature) {
      return;
    }
    prevLayoutSignature.current = signature;
    const index = rows.findIndex((row) => row.type === 'ayah' && row.verse.verseKey === topVerseKeyRef.current);
    if (index >= 0 && typeof listRef.current?.scrollToIndex === 'function') {
      listRef.current.scrollToIndex({ animated: false, index });
    }
  }, [rows, signature]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<ReadingRow>[] }) => {
    let topIndex = Number.POSITIVE_INFINITY;
    let topVerseKey: string | undefined;

    for (const token of viewableItems) {
      if (!token.isViewable || token.item === undefined || token.index == null) {
        continue;
      }
      const verseKey = verseKeyFromRow(token.item as ReadingRow);
      if (verseKey === undefined || token.index >= topIndex) {
        continue;
      }
      topIndex = token.index;
      topVerseKey = verseKey;
    }

    if (topVerseKey !== undefined) {
      topVerseKeyRef.current = topVerseKey;
      setFollowedVerseKey(topVerseKey);
      onVisibleRef.current?.(topVerseKey);
    }
  }, [setFollowedVerseKey]);

  const extendStart = () => {
    setStartExtendCount((count) => count + 1);
  };

  const extendEnd = () => {
    setEndExtendCount((count) => count + 1);
  };

  const recordHeight = (rowKey: string, height: number) => {
    heightCache.current.set(rowKey, height);
  };

  const renderItem = ({ item }: ListRenderItemInfo<ReadingRow>) => {
    if (item.type === 'surah-header') {
      return (
        <MeasuredRow rowKey={item.key} onHeight={recordHeight}>
          <SurahHeader chapter={item.chapter} testID={testID ? `${testID}-surah-${item.chapter.id}` : undefined} />
        </MeasuredRow>
      );
    }

    if (item.type === 'bismillah') {
      return (
        <MeasuredRow rowKey={item.key} onHeight={recordHeight}>
          <BismillahLine fontScale={fontScale} testID={testID ? `${testID}-bismillah` : undefined} text={item.text} />
        </MeasuredRow>
      );
    }

    const { verse } = item;
    const selected = selectedVerseKey === verse.verseKey;
    const recited = recitedVerseKey === verse.verseKey;
    const openActions = () => onOpenAyahActions(verse.verseKey);
    const openTafsir = onOpenTafsir === undefined ? undefined : () => onOpenTafsir(verse.verseKey);

    return (
      <MeasuredRow rowKey={item.key} onHeight={recordHeight}>
        <ReadingAyahRow
          fontScale={fontScale}
          highlightColor={highlightsByVerseId.get(verse.id) ?? null}
          onLongPress={openActions}
          onOpenActions={openActions}
          onOpenTafsir={openTafsir}
          onPress={() => onSelectVerseKey(verse.verseKey)}
          recited={recited}
          selected={selected}
          testID={testID ? `${testID}-ayah-${verse.verseKey}` : undefined}
          textImlaei={verse.textImlaei}
          textUthmani={verse.textUthmani}
          verseNumber={verse.verseNumber}
        />
      </MeasuredRow>
    );
  };

  const overrideItemLayout = (layout: { span?: number; size?: number }, item: ReadingRow) => {
    const cached = heightCache.current.get(item.key);
    layout.size = cached ?? estimateReadingRowHeight('reading', viewportHeight);
  };

  return (
    <ReaderModeFade mode="reading" testID={`${testID ?? 'reading-list'}-fade`}>
      {/* The toolbar floats over the top inset, so the list starts below it like the Mushaf list. */}
      <View style={{ alignItems: 'center', flex: 1, paddingBottom: bottomInset, paddingTop: topInset, width: '100%' }}>
        <View style={{ flex: 1, maxWidth: columnWidth, width: '100%' }}>
          <FlashList
            contentContainerStyle={{ paddingHorizontal: theme.space[5] }}
            data={rows}
            drawDistance={viewportHeight * 2}
            keyExtractor={(item) => item.key}
            maintainVisibleContentPosition={{ autoscrollToTopThreshold: 10 }}
            onEndReached={extendEnd}
            onEndReachedThreshold={0.6}
            onStartReached={extendStart}
            onStartReachedThreshold={0.6}
            onViewableItemsChanged={onViewableItemsChanged}
            overrideItemLayout={overrideItemLayout}
            ref={listRef}
            renderItem={renderItem}
            testID={testID}
            viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
          />
        </View>
      </View>
    </ReaderModeFade>
  );
}
