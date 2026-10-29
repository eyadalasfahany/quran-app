// The follow-scroll for the recited word (developer, 29 Oct 2026). While the reader follows the recitation, the
// line holding the recited word stays in the comfort band of the viewport. A line that leaves the band scrolls to a
// third down. Each list measures where the followed Text is on screen, in its own content coordinates (see
// follow-position.ts); this hook waits, guards the measurement, and scrolls. word-follow.ts holds the arithmetic.

import { useEffect, useLayoutEffect, useState } from 'react';
import type { HostInstance } from 'react-native';

import { capWordScrollStep, isPlausibleScreenTop } from './follow-position';
import { comfortBand, lineForOffset, scrollTargetForLine, type TextLine } from './word-follow';

// An animated scroll takes about this long; a word check waits for it, so a check never reads a moving line.
export const WORD_SETTLE_MS = 450;

export type FollowedTextProps = {
  /** The ref for the host Text that draws the followed text: the hook keeps the node it measures. */
  ref: (node: HostInstance | null) => void;
  onTextLayout: (event: { nativeEvent: { lines: readonly TextLine[] } }) => void;
};

export type WordFollowOptions = {
  /** The reader follows the recitation (playing, and not dragged away). Nothing is scrolled otherwise. */
  following: boolean;
  /** The text holding the recited word, as the list keys it, and the word's offset inside that text. */
  textKey: string | null;
  offset: number | null;
  /** The mini bar's footprint at the bottom of the viewport; the band is measured above it. */
  bottomInset: number;
  /** The viewport height until its first layout (0 when unknown: no scroll then). */
  fallbackHeight: number;
  reduceMotion: boolean;
  /**
   * The on-screen top of the followed Text (`text`, the node the hook holds), computed by the list in its content
   * coordinates. Null when it cannot be measured yet. The hook adds the line's own offset to it.
   */
  measureTextTop: (text: HostInstance, done: (top: number | null) => void) => void;
  /** The list's current scroll offset, and the scroll the hook asks for. */
  currentOffset: () => number;
  scrollTo: (offset: number, animated: boolean) => void;
};

export type WordFollow = {
  /** Spread onto the Text that draws the followed text: its ref and its laid-out lines. */
  textProps: (textKey: string) => FollowedTextProps;
  /** Put on the viewport: its height. The hook measures nothing across the viewport. */
  viewportProps: {
    onLayout: (event: { nativeEvent: { layout: { height: number } } }) => void;
  };
  /** A scroll is starting or has just finished: word checks wait for it to settle. */
  noteScroll: (animated: boolean) => void;
};

type Controller = WordFollow & {
  setOptions: (options: WordFollowOptions) => void;
  check: () => void;
  dispose: () => void;
};

/**
 * Whether the reader follows the recitation, and the follow-scroll for the recited word. The controller is one
 * object per list for its whole life; its state lives in closures, so the render never reads it.
 */
export function useWordFollow(options: WordFollowOptions): WordFollow {
  const [controller] = useState(createController);
  useLayoutEffect(() => {
    controller.setOptions(options);
  });

  const { following, textKey, offset } = options;
  useEffect(() => controller.dispose, [controller]);
  useEffect(() => {
    controller.check();
  }, [controller, following, textKey, offset]);

  return controller;
}

function createController(): Controller {
  let latest: WordFollowOptions | null = null;
  let viewportHeight: number | null = null;
  let known: { textKey: string; lines: readonly TextLine[] } | null = null;
  let textNode: HostInstance | null = null;
  let settleUntil = 0;
  let sequence = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const later = (ms: number) => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      check();
    }, ms);
  };

  // Measures the followed line on screen and scrolls it into the band when it has left.
  const check = () => {
    const now = latest;
    if (now === null || !now.following || now.textKey === null || now.offset === null) {
      return;
    }
    if (known === null || known.textKey !== now.textKey || textNode === null) {
      return;
    }
    const text = textNode;
    const height = viewportHeight ?? now.fallbackHeight;
    if (height <= 0) {
      return;
    }
    const wait = settleUntil - Date.now();
    if (wait > 0) {
      later(wait);
      return;
    }
    const offset = now.offset;
    const textLines = known.lines;
    const request = ++sequence;
    now.measureTextTop(text, (textTop) => {
      // A newer check, or an ayah scroll that began meanwhile, makes this measurement stale.
      if (request !== sequence || latest === null) {
        return;
      }
      const settling = settleUntil - Date.now();
      if (settling > 0) {
        later(settling);
        return;
      }
      if (textTop === null) {
        return;
      }
      const index = lineForOffset(textLines, offset);
      if (index < 0) {
        return;
      }
      const line = textLines[index]!;
      const lineTop = textTop + line.y;
      // A top far outside the viewport is a stale measurement: the ayah-level scroll brings the ayah into view.
      if (!isPlausibleScreenTop(lineTop, height)) {
        return;
      }
      const delta = scrollTargetForLine(lineTop, line.height, { height }, comfortBand(height - now.bottomInset));
      if (delta === null) {
        return;
      }
      const current = latest;
      const from = current.currentOffset();
      const target = Math.max(0, from + capWordScrollStep(delta, height));
      if (target === from) {
        return;
      }
      if (__DEV__) {
        console.debug('[follow] word scroll', { delta, from, height, lineTop, target, textKey: now.textKey });
      }
      settleUntil = Date.now() + (current.reduceMotion ? 0 : WORD_SETTLE_MS);
      current.scrollTo(target, !current.reduceMotion);
    });
  };

  return {
    check,
    dispose: () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
    noteScroll: (animated) => {
      settleUntil = Date.now() + (animated ? WORD_SETTLE_MS : 0);
      if (animated) {
        later(WORD_SETTLE_MS);
      }
    },
    setOptions: (options) => {
      latest = options;
    },
    textProps: (textKey) => ({
      ref: (node) => {
        textNode = node;
      },
      onTextLayout: (event) => {
        known = { lines: event.nativeEvent.lines, textKey };
        check();
      },
    }),
    viewportProps: {
      onLayout: (event) => {
        viewportHeight = event.nativeEvent.layout.height;
        check();
      },
    },
  };
}
