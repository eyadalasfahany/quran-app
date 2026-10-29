// The follow-scroll for the recited word (developer, 29 Oct 2026). While the reader follows the recitation, the
// line holding the recited word stays in the comfort band of the viewport. A line that leaves the band scrolls to a
// third down. The position is measured on screen (measureLayout against the viewport), so it is right at any scroll
// offset. word-follow.ts holds the arithmetic; this hook measures, waits and scrolls.

import { useEffect, useLayoutEffect, useState } from 'react';
import type { HostInstance } from 'react-native';

import { measureInViewport } from './measure-in-viewport';
import { comfortBand, lineForOffset, scrollTargetForLine, type TextLine } from './word-follow';

// An animated scroll takes about this long; a word check waits for it, so a check never reads a moving line.
export const WORD_SETTLE_MS = 450;

export type FollowedTextProps = {
  /** A callback ref: the host Text is measured against the viewport. */
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
  /** The list's current scroll offset, and the scroll the hook asks for. */
  currentOffset: () => number;
  scrollTo: (offset: number, animated: boolean) => void;
};

export type WordFollow = {
  /** Spread onto the Text that draws the followed text: its ref and its laid-out lines. */
  textProps: (textKey: string) => FollowedTextProps;
  /** Put on the viewport: its height, and the parent the Text is measured against. */
  viewportProps: {
    ref: (node: HostInstance | null) => void;
    onLayout: (event: { nativeEvent: { layout: { height: number } } }) => void;
  };
  /** An ayah-level scroll is starting now: word checks wait for it to settle. */
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
  let textNode: HostInstance | null = null;
  let viewportNode: HostInstance | null = null;
  let viewportHeight: number | null = null;
  let known: { textKey: string; lines: readonly TextLine[] } | null = null;
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
    if (known === null || known.textKey !== now.textKey) {
      return;
    }
    const text = textNode;
    const viewport = viewportNode;
    const height = viewportHeight ?? now.fallbackHeight;
    if (text === null || viewport === null || height <= 0) {
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
    measureInViewport(text, viewport, (top) => {
      // A newer check, or an ayah scroll that began meanwhile, makes this measurement stale.
      if (request !== sequence || latest === null) {
        return;
      }
      const settling = settleUntil - Date.now();
      if (settling > 0) {
        later(settling);
        return;
      }
      const index = lineForOffset(textLines, offset);
      if (index < 0) {
        return;
      }
      const line = textLines[index]!;
      const delta = scrollTargetForLine(top + line.y, line.height, { height }, comfortBand(height - now.bottomInset));
      if (delta === null) {
        return;
      }
      const current = latest;
      const from = current.currentOffset();
      const target = Math.max(0, from + delta);
      if (target === from) {
        return;
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
      ref: (node) => {
        viewportNode = node;
      },
      onLayout: (event) => {
        viewportHeight = event.nativeEvent.layout.height;
        check();
      },
    },
  };
}
