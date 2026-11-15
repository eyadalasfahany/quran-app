// The follow-scroll for the recited word on the Madinah page (ADR 0023, 0037). The page is drawn in Skia, so there is
// no Text to measure: the line is a box in page units, and the page's place on screen is known from the list's layout.
// It reuses the pure arithmetic of the Text follow (word-follow.ts, follow-position.ts) and its settle timing.
import { useEffect, useLayoutEffect, useState } from 'react';

import { capWordScrollStep, isPlausibleScreenTop } from '../follow-position';
import { WORD_SETTLE_MS } from '../useWordFollow';
import { comfortBand, scrollTargetForLine } from '../word-follow';

export type BoxFollowOptions = {
  /** The reader follows the recitation (playing, not dragged away). Nothing is scrolled otherwise. */
  following: boolean;
  /** The line to keep in view, in page units (from the word box, else the ayah's first line). Null: nothing to follow. */
  line: { y0: number; y1: number } | null;
  /** Changes when the line does, so a new line is checked at once. */
  lineKey: string | null;
  /** Screen units per page unit. */
  scale: number;
  /** The screen top of the page's artwork (its top edge), or null when it is not laid out. */
  pageTop: () => number | null;
  /** The mini bar's footprint at the bottom of the viewport. */
  bottomInset: number;
  /** The viewport height until its first layout. */
  fallbackHeight: number;
  reduceMotion: boolean;
  currentOffset: () => number;
  scrollTo: (offset: number, animated: boolean) => void;
};

export type BoxFollow = {
  viewportProps: { onLayout: (event: { nativeEvent: { layout: { height: number } } }) => void };
  /** A scroll is starting or has just finished: checks wait for it to settle. */
  noteScroll: (animated: boolean) => void;
};

type Controller = BoxFollow & {
  setOptions: (options: BoxFollowOptions) => void;
  check: () => void;
  dispose: () => void;
};

/** One controller per list: its state lives in closures, so a render never reads it (as useWordFollow does). */
function createController(): Controller {
  let latest: BoxFollowOptions | null = null;
  let viewportHeight: number | null = null;
  let settleUntil = 0;
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

  const check = (): void => {
    const now = latest;
    if (now === null || !now.following || now.line === null) {
      return;
    }
    const height = viewportHeight ?? now.fallbackHeight;
    if (height <= 0) {
      return;
    }
    const wait = settleUntil - Date.now();
    if (wait > 0) {
      later(wait);
      return;
    }
    const pageTop = now.pageTop();
    if (pageTop === null) {
      return;
    }
    const lineTop = pageTop + now.line.y0 * now.scale;
    const lineHeight = (now.line.y1 - now.line.y0) * now.scale;
    if (!isPlausibleScreenTop(lineTop, height)) {
      return;
    }
    const delta = scrollTargetForLine(lineTop, lineHeight, { height }, comfortBand(height - now.bottomInset));
    if (delta === null) {
      return;
    }
    const from = now.currentOffset();
    const target = Math.max(0, from + capWordScrollStep(delta, height));
    if (target === from) {
      return;
    }
    settleUntil = Date.now() + (now.reduceMotion ? 0 : WORD_SETTLE_MS);
    now.scrollTo(target, !now.reduceMotion);
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
    },
    setOptions: (options) => {
      latest = options;
    },
    viewportProps: {
      onLayout: (event) => {
        viewportHeight = event.nativeEvent.layout.height;
        check();
      },
    },
  };
}

/** Keeps the followed line in the comfort band of the list, while the reader follows the recitation. */
export function useBoxFollow(options: BoxFollowOptions): BoxFollow {
  const [controller] = useState(createController);
  useLayoutEffect(() => {
    controller.setOptions(options);
  });

  const { following, line, lineKey, scale } = options;
  useEffect(() => controller.dispose, [controller]);
  useEffect(() => {
    controller.check();
  }, [controller, following, line, lineKey, scale]);

  return controller;
}
