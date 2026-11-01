import {
  FlashList,
  type FlashListRef,
  type ListRenderItemInfo,
  type ViewToken,
} from '@shopify/flash-list';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions, type HostInstance } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { openContentDb } from '@/core/db/content/open';
import { useScreenInsets } from '@/core/layout/useScreenInsets';
import { useTheme } from '@/core/theme';
import type { HighlightColor } from '@/features/library/data/model';

import { BismillahLine } from './components/BismillahLine';
import { MeasuredRow } from './components/MeasuredRow';
import { ReaderModeFade } from './components/ReaderModeFade';
import { ReadingAyahRow } from './components/ReadingAyahRow';
import { SurahHeader } from './components/SurahHeader';
import { readingColumnWidth } from './layout';
import { followedTextScreenTop, rowContentTop } from './follow-position';
import { measureWithin } from './measure-within';
import { estimateReadingRowHeight, heightCacheSignature, ReadingHeightCache } from './reading-heights';
import type { ReadingRow } from './reading-list-types';
import { FOLLOW_VIEW_POSITION, recitedWordOffset } from './word-follow';
import { useWordFollow } from './useWordFollow';
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
  recitedVerseKey?: string | null;
  /** The recited word (1-based) inside the recited ayah, when the reciter has word segments. */
  activeWord?: number | null;
  /** Whether a reciter can play from a row (useAudioAvailable). */
  audioAvailable?: boolean;
  /** The player is playing: the recited row's play control shows pause. */
  playing?: boolean;
  /** The ayah to bring into view: set while the reader follows the recitation, null otherwise. */
  followKey?: string | null;
  highlightsByVerseId?: ReadonlyMap<number, HighlightColor>;
  khatmaMarkerVerseId?: number | null;
  horizontalGutter?: number;
  topInset?: number;
  bottomInset?: number;
  // Bottom padding inside the scroll, so the last ayah scrolls clear of the reader's mini player bar.
  contentBottomInset?: number;
  onSelectVerseKey: (verseKey: string) => void;
  onOpenAyahActions: (verseKey: string) => void;
  onOpenTafsir?: (verseKey: string) => void;
  onPlayVerseKey?: (verseKey: string) => void;
  /** Pauses the player; the recited row's play control calls it while playing. */
  onPause?: () => void;
  onVisibleVerseKey?: (verseKey: string) => void;
  /** A drag began: the reader is scrolling by hand, so following pauses. */
  onUserScrollStart?: () => void;
  testID?: string;
};

const NO_HIGHLIGHTS: ReadonlyMap<number, HighlightColor> = new Map();

export function ReadingList({
  anchorVerseKey,
  fontScale = 1,
  recitedVerseKey = null,
  activeWord = null,
  audioAvailable = false,
  playing = false,
  followKey = null,
  highlightsByVerseId = NO_HIGHLIGHTS,
  khatmaMarkerVerseId = null,
  horizontalGutter = 0,
  topInset = 0,
  bottomInset = 0,
  contentBottomInset = 0,
  onSelectVerseKey,
  onOpenAyahActions,
  onOpenTafsir,
  onPlayVerseKey,
  onPause,
  onVisibleVerseKey,
  onUserScrollStart,
  testID,
}: ReadingListProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  // The screen pads the side insets (a notch in landscape), so the column is what is left of the window after them.
  const sides = useScreenInsets();
  const columnWidth = readingColumnWidth(windowWidth - sides.start - sides.end, horizontalGutter);
  const listRef = useRef<FlashListRef<ReadingRow>>(null);
  const heightCache = useRef(new ReadingHeightCache());
  const topVerseKeyRef = useRef<string | null>(null);
  const [openedVerseKey, setOpenedVerseKey] = useState(anchorVerseKey);
  const [followedVerseKey, setFollowedVerseKey] = useState<string | null>(null);
  // The anchor moves by the reader's own scroll (its echo matches the top ayah, so nothing re-centres) or from
  // outside (a mode change, a jump). While following, the recited ayah is the anchor and the recitation scrolls.
  const [seenAnchorKey, setSeenAnchorKey] = useState(anchorVerseKey);
  const anchorMoved = seenAnchorKey !== anchorVerseKey;
  if (anchorMoved) {
    setSeenAnchorKey(anchorVerseKey);
  }
  if (followKey === null && anchorMoved && anchorVerseKey !== followedVerseKey && anchorVerseKey !== openedVerseKey) {
    setOpenedVerseKey(anchorVerseKey);
  }
  const openedVerseRef = useRef(openedVerseKey);
  const followingRef = useRef(followKey !== null);
  useLayoutEffect(() => {
    followingRef.current = followKey !== null;
  });
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
    // While following, the recitation's scroll (below) moves the list, and the anchor echoes it.
    if (followingRef.current) {
      return;
    }
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

  // Following the recitation: the recited ayah moves to the top third. Animated, or a jump under Reduce Motion.
  // An ayah outside the window recentres the window first; the rows then bring the scroll on the next pass.
  const followIndex = followKey === null ? -1 : anchorRowIndex(rows, followKey);
  if (followKey !== null && followIndex < 0 && openedVerseKey !== followKey) {
    setOpenedVerseKey(followKey);
  }
  const followRow = followIndex < 0 ? undefined : rows[followIndex];
  // The recited word's offset inside the followed ayah's text (the Text the row draws), for the word follow-scroll.
  const followedOffset =
    followRow?.type === 'ayah' && activeWord !== null
      ? recitedWordOffset(followRow.verse.textUthmani, activeWord)
      : null;
  // The followed row's root: the followed Text is measured inside its own row, which shares the list's content with
  // the row cell (no scroll view between them).
  const followedRowNode = useRef<HostInstance | null>(null);
  // True while FlashList runs the ayah scroll: no word check measures then.
  const ayahScrolling = useRef(false);
  const setFollowedRow = useCallback((node: HostInstance | null) => {
    followedRowNode.current = node;
  }, []);
  const word = useWordFollow({
    bottomInset: contentBottomInset,
    currentOffset: () =>
      typeof listRef.current?.getAbsoluteLastScrollOffset === 'function'
        ? listRef.current.getAbsoluteLastScrollOffset()
        : 0,
    fallbackHeight: viewportHeight - contentBottomInset,
    following: followKey !== null,
    // The on-screen top of the followed Text: the row's content top (layout y plus the first item offset), plus the
    // Text's offset in the row, minus the scroll offset. getAbsoluteLastScrollOffset is the scroll content offset
    // that scrollToOffset takes (it adds the first item offset back, and scrollToOffset skips it by default).
    measureTextTop: (text, done) => {
      const list = listRef.current;
      const row = followedRowNode.current;
      const layout = list !== null && followIndex >= 0 ? list.getLayout(followIndex) : undefined;
      if (ayahScrolling.current || list === null || row === null || layout === undefined) {
        done(null);
        return;
      }
      const rowTop = rowContentTop(layout.y, list.getFirstItemOffset());
      measureWithin(text, row, (textTopInRow) => {
        done(
          textTopInRow === null
            ? null
            : followedTextScreenTop({
                rowTop,
                scrollOffset: list.getAbsoluteLastScrollOffset(),
                textTopInRow,
              }),
        );
      });
    },
    offset: followedOffset,
    reduceMotion,
    scrollTo: (offset, animated) => {
      if (typeof listRef.current?.scrollToOffset === 'function') {
        listRef.current.scrollToOffset({ animated, offset });
      }
    },
    textKey: followKey,
  });
  // The ayah scroll runs once per recited ayah. A window extension (new rows above or below) re-runs this effect, but
  // FlashList keeps the content in place, so scrolling again would restart the animation and move the list.
  const ayahScrolledKey = useRef<string | null>(null);
  useEffect(() => {
    if (followKey === null) {
      ayahScrolledKey.current = null;
      return;
    }
    if (followIndex < 0 || ayahScrolledKey.current === followKey) {
      return;
    }
    const list = listRef.current;
    if (typeof list?.scrollToIndex !== 'function') {
      return;
    }
    ayahScrolledKey.current = followKey;
    ayahScrolling.current = true;
    word.noteScroll(!reduceMotion);
    if (__DEV__) {
      console.debug('[follow] ayah scroll', { followIndex, followKey, from: list.getAbsoluteLastScrollOffset() });
    }
    // FlashList's scroll to an index takes several steps, and its reported offset is a projection until they
    // finish. Word checks wait for the promise, then for the settle.
    void Promise.resolve(
      list.scrollToIndex({ animated: !reduceMotion, index: followIndex, viewPosition: FOLLOW_VIEW_POSITION }),
    ).finally(() => {
      ayahScrolling.current = false;
      word.noteScroll(!reduceMotion);
    });
  }, [followIndex, followKey, reduceMotion, rows, word]);

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

  // FlashList repaints rows only when data or extraData changes; renderItem reads these three.
  const rowExtraData = useMemo(
    () => ({ activeWord, audioAvailable, followKey, highlightsByVerseId, playing, recitedVerseKey }),
    [activeWord, audioAvailable, followKey, highlightsByVerseId, playing, recitedVerseKey],
  );

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
    const recited = recitedVerseKey === verse.verseKey;
    const openActions = () => onOpenAyahActions(verse.verseKey);
    const openTafsir = onOpenTafsir === undefined ? undefined : () => onOpenTafsir(verse.verseKey);
    // The recited row pauses the player; any other row starts playback from its ayah.
    const recitedPlaying = recited && playing;
    const play = recitedPlaying
      ? onPause
      : onPlayVerseKey === undefined
        ? undefined
        : () => onPlayVerseKey(verse.verseKey);

    return (
      <MeasuredRow rowKey={item.key} onHeight={recordHeight}>
        <ReadingAyahRow
          activeWord={activeWord}
          audioAvailable={audioAvailable}
          fontScale={fontScale}
          followedText={followKey === verse.verseKey ? word.textProps(verse.verseKey) : undefined}
          highlightColor={highlightsByVerseId.get(verse.id) ?? null}
          khatmaMarked={khatmaMarkerVerseId === verse.id}
          onLongPress={openActions}
          onOpenActions={openActions}
          onOpenTafsir={openTafsir}
          onPlay={play}
          onPress={() => onSelectVerseKey(verse.verseKey)}
          playing={recitedPlaying}
          recited={recited}
          rowRef={followKey === verse.verseKey ? setFollowedRow : undefined}
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
        <View {...word.viewportProps} style={{ flex: 1, maxWidth: columnWidth, width: '100%' }}>
          <FlashList
            contentContainerStyle={{ paddingBottom: contentBottomInset, paddingHorizontal: theme.space[5] }}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            data={rows}
            drawDistance={viewportHeight * 2}
            extraData={rowExtraData}
            keyExtractor={(item) => item.key}
            maintainVisibleContentPosition={{ autoscrollToTopThreshold: 10 }}
            onEndReached={extendEnd}
            onEndReachedThreshold={0.6}
            onScrollBeginDrag={onUserScrollStart}
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
