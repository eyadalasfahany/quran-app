import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollViewInstance } from 'react-native';

import { FOLLOW_RESUME_MS, FOLLOWING, pauseFollow, scrollEnded, settleFollow, type FollowState } from '@/features/reader/follow';
import { recitedWordOffset, type TextLine } from '@/features/reader/word-follow';

import { ayahFollowTarget } from '../ayah-follow';

/**
 * Keeps the ayah card's recited word on screen while the player plays (developer, 29 Oct 2026). A drag on the card
 * pauses following; the drag's end starts the 5 s clock, the same rule as the reader. A new ayah scrolls the card
 * to its top. The card's Text reports its lines, and its scroll view reports its offset and height.
 */
export function useAyahCardFollow({
  activeWord,
  label,
  playing,
  scrollable,
  scrollRef,
  text,
}: {
  /** The ayah's identity: a change scrolls the card to its top. */
  label: string;
  /** The ayah's text as drawn: the words joined by single spaces. */
  text: string;
  activeWord: number | null;
  playing: boolean;
  /** Whether the card scrolls at all. A card that fits has nothing to follow. */
  scrollable: boolean;
  /** The card's scroll view, which the component attaches. */
  scrollRef: RefObject<ScrollViewInstance | null>;
}) {
  const offsetRef = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [layout, setLayout] = useState<{ label: string; lines: readonly TextLine[] } | null>(null);
  const [follow, setFollow] = useState<FollowState>(FOLLOWING);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  // A new ayah starts at its top.
  useEffect(() => {
    offsetRef.current = 0;
    scrollRef.current?.scrollTo({ animated: false, y: 0 });
  }, [label, scrollRef]);

  // The lines belong to the ayah they were measured for; a stale set is ignored until the new text lays out.
  const lines = layout !== null && layout.label === label ? layout.lines : null;
  const offset = activeWord === null ? null : recitedWordOffset(text, activeWord);
  const following = playing && follow.following;

  useEffect(() => {
    if (!following || !scrollable || lines === null || offset === null || viewportHeight === null) {
      return;
    }
    const target = ayahFollowTarget({ lines, offset, scrollOffset: offsetRef.current, viewportHeight });
    if (target !== null) {
      scrollRef.current?.scrollTo({ animated: true, y: target });
    }
  }, [following, lines, offset, scrollRef, scrollable, viewportHeight]);

  const onTextLayout = useCallback(
    (event: { nativeEvent: { lines: readonly TextLine[] } }) => {
      setLayout({ label, lines: event.nativeEvent.lines });
    },
    [label],
  );

  const onViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setViewportHeight((previous) => (previous === height ? previous : height));
  }, []);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const onScrollBeginDrag = useCallback(() => {
    clearTimer();
    setFollow(pauseFollow(Date.now()));
  }, [clearTimer]);

  const onScrollEndDrag = useCallback(() => {
    clearTimer();
    const now = Date.now();
    setFollow((current) => scrollEnded(current, now));
    timer.current = setTimeout(() => {
      timer.current = null;
      setFollow((current) => settleFollow(current, Date.now()));
    }, FOLLOW_RESUME_MS);
  }, [clearTimer]);

  return { onScroll, onScrollBeginDrag, onScrollEndDrag, onTextLayout, onViewportLayout };
}
