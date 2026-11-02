import { useRef, useState } from 'react';
import { I18nManager, type GestureResponderEvent } from 'react-native';

import { fractionAfterDrag, playbackFraction } from '../player-view';

// A touch that moves less than this (points) is a tap, not a drag.
const TAP_SLOP = 8;

export type SeekDragResponder = {
  onStartShouldSetResponder: () => boolean;
  onResponderGrant: (event: GestureResponderEvent) => void;
  onResponderMove: (event: GestureResponderEvent) => void;
  onResponderRelease: () => void;
  onResponderTerminate: () => void;
};

export type SeekDrag = {
  /** The position to show: where the finger is while dragging, the playback position otherwise. */
  shownPositionMs: number;
  /** The fill share to show, 0 to 1. */
  shownFraction: number;
  /** True between grant and release, so a view can tell a drag from a steady position. */
  dragging: boolean;
  responder: SeekDragResponder;
};

/**
 * The seek drag shared by the Mushaf player bar and the Azkar player bar (ADR 0047).
 *
 * A drag starts from the playback fraction and moves with the finger's horizontal distance. In Arabic the track runs
 * right to left, so `fractionAfterDrag` flips the sign. The fill and the elapsed label follow the finger; the seek is
 * sent once, on release. A touch that never moves past the tap slop is a tap: with `tapSeeks`, a tap seeks to the
 * tapped point (the Azkar bar); without it, a tap changes nothing (the Mushaf bar, unchanged). With no known duration
 * (`canSeek` false) nothing is grabbed and nothing is sent.
 */
export function useSeekDrag({
  width,
  positionMs,
  durationMs,
  canSeek,
  onSeek,
  tapSeeks = false,
}: {
  width: number;
  positionMs: number;
  durationMs: number;
  canSeek: boolean;
  onSeek: (positionMs: number) => void;
  tapSeeks?: boolean;
}): SeekDrag {
  const [dragFraction, setDragFraction] = useState<number | null>(null);
  const fraction = playbackFraction(positionMs, durationMs);

  // A drag starts at the touch's page x and the fraction it started from. The responder props are read on every
  // render, so each handler sees the current width, duration and seek callback.
  const drag = useRef<{
    startX: number;
    startFraction: number;
    tapFraction: number;
    current: number;
    moved: boolean;
  } | null>(null);

  const onResponderGrant = (event: GestureResponderEvent) => {
    const { locationX, pageX } = event.nativeEvent;
    // locationX counts from the physical left edge; under RTL the track reads from the right.
    const ratio = width > 0 ? Math.min(1, Math.max(0, locationX / width)) : fraction;
    const tapFraction = I18nManager.isRTL ? 1 - ratio : ratio;
    drag.current = { startX: pageX, startFraction: fraction, tapFraction, current: fraction, moved: false };
    setDragFraction(fraction);
  };

  const onResponderMove = (event: GestureResponderEvent) => {
    const current = drag.current;
    if (current === null) {
      return;
    }
    const dx = event.nativeEvent.pageX - current.startX;
    if (Math.abs(dx) > TAP_SLOP) {
      current.moved = true;
    }
    const next = fractionAfterDrag(current.startFraction, dx, width, I18nManager.isRTL);
    current.current = next;
    setDragFraction(next);
  };

  const onResponderRelease = () => {
    const current = drag.current;
    drag.current = null;
    setDragFraction(null);
    if (current === null || !canSeek) {
      return;
    }
    if (!current.moved && !tapSeeks) {
      return;
    }
    const target = current.moved ? current.current : current.tapFraction;
    onSeek(Math.round(target * durationMs));
  };

  // A terminated touch ends the drag the same way a release does, as the Mushaf bar always has.
  const onResponderTerminate = onResponderRelease;

  const shownFraction = dragFraction ?? fraction;
  return {
    shownPositionMs: dragFraction === null ? positionMs : Math.round(dragFraction * durationMs),
    shownFraction,
    dragging: dragFraction !== null,
    responder: {
      onStartShouldSetResponder: () => canSeek,
      onResponderGrant,
      onResponderMove,
      onResponderRelease,
      onResponderTerminate,
    },
  };
}
