import {
  FlashList,
  type FlashListRef,
  type ListRenderItemInfo,
  type ViewToken,
} from '@shopify/flash-list';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { openContentDb } from '@/core/db/content/open';
import { timing } from '@/core/theme';
import type { HighlightColor } from '@/features/library/data/model';

import { BismillahLine } from './components/BismillahLine';
import { FocusAyah } from './components/FocusAyah';
import { ReadingAyahRow } from './components/ReadingAyahRow';
import { SurahHeader } from './components/SurahHeader';
import { readingColumnWidth } from './layout';
import { estimateReadingRowHeight, heightCacheSignature, ReadingHeightCache } from './reading-heights';
import type { ReadingListMode, ReadingRow, TranslationResourceMeta } from './reading-list-types';
import {
  buildReadingRows,
  LAST_VERSE_ID,
  READING_WINDOW_EXTEND,
  resolveCenterId,
  verseKeyFromRow,
  verseWindowBounds,
} from './reading-window';

export type ReadingListProps = {
  mode: ReadingListMode;
  anchorVerseKey: string;
  fontScale?: number;
  translationResourceIds?: readonly number[];
  translationMeta?: readonly TranslationResourceMeta[];
  selectedVerseKey?: string | null;
  recitedVerseKey?: string | null;
  highlightsByVerseId?: ReadonlyMap<number, HighlightColor>;
  horizontalGutter?: number;
  topInset?: number;
  bottomInset?: number;
  onSelectVerseKey: (verseKey: string) => void;
  onOpenAyahActions: (verseKey: string) => void;
  onVisibleVerseKey?: (verseKey: string) => void;
  testID?: string;
};

export function ReadingList({
  mode,
  anchorVerseKey,
  fontScale = 1,
  translationResourceIds = [],
  translationMeta = [],
  selectedVerseKey = null,
  recitedVerseKey = null,
  highlightsByVerseId = new Map(),
  horizontalGutter = 0,
  topInset = 0,
  bottomInset = 0,
  onSelectVerseKey,
  onOpenAyahActions,
  onVisibleVerseKey,
  testID,
}: ReadingListProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const columnWidth = readingColumnWidth(windowWidth, horizontalGutter);
  const listRef = useRef<FlashListRef<ReadingRow>>(null);
  const heightCache = useRef(new ReadingHeightCache());
  const topVerseKeyRef = useRef<string | null>(null);
  const modeRef = useRef(mode);
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

  const translationMetaMap = useMemo(() => new Map(translationMeta.map((meta) => [meta.resourceId, meta])), [translationMeta]);
  const executor = useMemo(() => openContentDb().executor, []);
  const centerId = useMemo(() => resolveCenterId(executor, openedVerseKey), [executor, openedVerseKey]);

  const windowRange = useMemo(() => {
    const base = verseWindowBounds(centerId);
    return {
      fromId: Math.max(1, base.fromId - startExtendCount * READING_WINDOW_EXTEND),
      toId: Math.min(LAST_VERSE_ID, base.toId + endExtendCount * READING_WINDOW_EXTEND),
    };
  }, [centerId, endExtendCount, startExtendCount]);

  const signature = heightCacheSignature(columnWidth, fontScale, translationResourceIds, mode);
  useEffect(() => {
    heightCache.current.clearForSignature(signature);
  }, [signature]);

  const rows = useMemo(() => {
    return buildReadingRows(executor, windowRange.fromId, windowRange.toId, translationResourceIds, translationMetaMap);
  }, [executor, translationMetaMap, translationResourceIds, windowRange.fromId, windowRange.toId]);

  const focusBlockHeight = Math.max(320, windowHeight - topInset - bottomInset);
  const modeOpacity = useSharedValue(1);

  useEffect(() => {
    modeOpacity.value = 0;
    modeOpacity.value = withTiming(1, timing('standard'));
  }, [mode, modeOpacity]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: modeOpacity.value,
  }));

  useLayoutEffect(() => {
    const modeChanged = modeRef.current !== mode;
    modeRef.current = mode;
    const openedChanged = openedVerseRef.current !== openedVerseKey;
    openedVerseRef.current = openedVerseKey;
    // The screen echoes the ayah a scroll just revealed. Pinning that ayah to the
    // top is what made a small drag jump.
    if (!modeChanged && !openedChanged && followedVerseKey !== null && anchorVerseKey === followedVerseKey) {
      return;
    }
    if (!modeChanged && !openedChanged && followedVerseKey !== null && anchorVerseKey === openedVerseKey) {
      return;
    }
    const targetKey = modeChanged ? (topVerseKeyRef.current ?? anchorVerseKey) : anchorVerseKey;
    const index = rows.findIndex((row) => row.type === 'ayah' && row.verse.verseKey === targetKey);
    if (index >= 0 && typeof listRef.current?.scrollToIndex === 'function') {
      if (!modeChanged) {
        topVerseKeyRef.current = anchorVerseKey;
      }
      listRef.current.scrollToIndex({ animated: false, index });
    }
  }, [anchorVerseKey, followedVerseKey, mode, openedVerseKey, rows]);

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
    const highlightColor = highlightsByVerseId.get(verse.id) ?? null;
    const selected = selectedVerseKey === verse.verseKey;
    const recited = recitedVerseKey === verse.verseKey;
    const openActions = () => onOpenAyahActions(verse.verseKey);
    const select = () => onSelectVerseKey(verse.verseKey);

    if (mode === 'focus') {
      return (
        <MeasuredRow fixedHeight={focusBlockHeight} rowKey={item.key} onHeight={recordHeight}>
          <FocusAyah
            blockHeight={focusBlockHeight}
            fontScale={fontScale}
            highlightColor={highlightColor}
            onLongPress={openActions}
            onOpenActions={openActions}
            onPress={select}
            recited={recited}
            selected={selected}
            testID={testID ? `${testID}-ayah-${verse.verseKey}` : undefined}
            textImlaei={verse.textImlaei}
            textUthmani={verse.textUthmani}
            verseNumber={verse.verseNumber}
          />
        </MeasuredRow>
      );
    }

    return (
      <MeasuredRow rowKey={item.key} onHeight={recordHeight}>
        <ReadingAyahRow
          fontScale={fontScale}
          highlightColor={highlightColor}
          onLongPress={openActions}
          onOpenActions={openActions}
          onPress={select}
          recited={recited}
          selected={selected}
          testID={testID ? `${testID}-ayah-${verse.verseKey}` : undefined}
          textImlaei={verse.textImlaei}
          textUthmani={verse.textUthmani}
          translations={item.translations}
          verseKey={verse.verseKey}
          verseNumber={verse.verseNumber}
        />
      </MeasuredRow>
    );
  };

  const overrideItemLayout = (layout: { span?: number; size?: number }, item: ReadingRow) => {
    const cached = heightCache.current.get(item.key);
    layout.size = cached ?? estimateReadingRowHeight(mode, focusBlockHeight);
  };

  return (
    <Animated.View style={[{ flex: 1, width: '100%' }, fadeStyle]}>
      <View style={{ alignItems: 'center', flex: 1, width: '100%' }}>
        <View style={{ flex: 1, maxWidth: columnWidth, width: '100%' }}>
          <FlashList
            data={rows}
            drawDistance={focusBlockHeight * 2}
            key={mode}
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
    </Animated.View>
  );
}

function MeasuredRow({
  rowKey,
  onHeight,
  fixedHeight,
  children,
}: {
  rowKey: string;
  onHeight: (rowKey: string, height: number) => void;
  fixedHeight?: number;
  children: ReactNode;
}) {
  return (
    <View
      onLayout={(event) => {
        onHeight(rowKey, fixedHeight ?? event.nativeEvent.layout.height);
      }}
      style={fixedHeight === undefined ? undefined : { height: fixedHeight }}
    >
      {children}
    </View>
  );
}
