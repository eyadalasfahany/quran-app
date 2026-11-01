import { withSpring, withTiming, type SharedValue, type WithSpringConfig } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { timing } from '@/core/theme';

import { nextDetent, type Detent, type SheetDetents } from '../form-sheet';

/**
 * The shared values that drive one sheet. Helpers below mutate them; the sheet only reads them.
 * They stay outside the component so the writes run where Reanimated expects them.
 */
export type SheetMotion = {
  /** Card top for each detent. */
  positions: SharedValue<SheetDetents>;
  /** The detent the card rests at. */
  detent: SharedValue<Detent>;
  /** The card's top edge. */
  top: SharedValue<number>;
  /** Multiplies the card and scrim opacity; Reduce Motion fades them in and out with it. */
  fade: SharedValue<number>;
  /** The content's scroll offset. */
  scrollOffset: SharedValue<number>;
  /** Whether the current touch began on the scrolling content rather than the grabber or header. */
  scrollTouched: SharedValue<boolean>;
  /** The top edge and finger position a drag follows from; rebased while content scrolls. */
  anchorTop: SharedValue<number>;
  anchorY: SharedValue<number>;
  /** The top edge when the drag began; the sheet's own movement is measured from it. */
  activationTop: SharedValue<number>;
  /** Whether the sheet moved during this drag. */
  dragged: SharedValue<boolean>;
};

/** Gives the card its detents, keeping it at its detent when the window changes. */
export function layoutSheet(motion: SheetMotion, detents: SheetDetents): void {
  motion.positions.value = detents;
  const current = motion.detent.value;
  if (current !== 'closed') {
    motion.top.value = detents[current];
  }
}

/**
 * Opens the card at its opening detent (mid, or full in a short window). Reduce Motion sets the position at once
 * and fades the card in.
 */
export function openSheet(
  motion: SheetMotion,
  reduceMotion: boolean,
  springConfig: WithSpringConfig,
  opening: 'full' | 'mid' = 'mid',
): void {
  motion.detent.value = opening;
  if (reduceMotion) {
    motion.top.value = motion.positions.value[opening];
    motion.fade.value = withTiming(1, timing('slow'));
    return;
  }
  motion.top.value = withSpring(motion.positions.value[opening], springConfig);
}

/** Moves the card to a detent without a drag. */
export function snapSheet(motion: SheetMotion, target: 'full' | 'mid', springConfig: WithSpringConfig): void {
  motion.detent.value = target;
  motion.top.value = withSpring(motion.positions.value[target], springConfig);
}

/**
 * Slides the card to closed, or fades it under Reduce Motion, then calls `onLeave` once the
 * animation has finished.
 */
export function closeSheet(
  motion: SheetMotion,
  reduceMotion: boolean,
  springConfig: WithSpringConfig,
  onLeave: () => void,
): void {
  motion.detent.value = 'closed';
  if (reduceMotion) {
    motion.fade.value = withTiming(0, timing('slow'), (finished) => {
      if (finished) {
        scheduleOnRN(onLeave);
      }
    });
    return;
  }
  motion.top.value = withSpring(motion.positions.value.closed, springConfig, (finished) => {
    if (finished) {
      scheduleOnRN(onLeave);
    }
  });
}

/** A pan begins: remember where the card was and where the finger was. */
export function beginDrag(motion: SheetMotion, translationY: number): void {
  'worklet';
  motion.anchorTop.value = motion.top.value;
  motion.anchorY.value = translationY;
  motion.activationTop.value = motion.top.value;
  motion.dragged.value = false;
}

/**
 * The pan moves the card with the finger, clamped between full and closed. At full, while a touch
 * on the content has it scrolled past its top, the card holds still and the anchor follows the
 * finger, so the content scrolls instead and a drag back to the top does not jump. A drag on the
 * grabber or header always moves the card.
 */
export function followDrag(motion: SheetMotion, translationY: number): void {
  'worklet';
  if (motion.detent.value === 'full' && motion.scrollTouched.value && motion.scrollOffset.value > 0) {
    motion.anchorTop.value = motion.top.value;
    motion.anchorY.value = translationY;
    return;
  }
  const candidate = motion.anchorTop.value + (translationY - motion.anchorY.value);
  motion.top.value = Math.min(Math.max(candidate, motion.positions.value.full), motion.positions.value.closed);
  if (motion.top.value !== motion.activationTop.value) {
    motion.dragged.value = true;
  }
}

/**
 * The pan ends: settle on the detent the drag or flick chose. A drag that never moved the card
 * (the content was scrolling) leaves it where it is. Closing hands off to `onClose`.
 */
export function releaseDrag(
  motion: SheetMotion,
  velocityY: number,
  springConfig: WithSpringConfig,
  onDetent: (detent: Detent) => void,
  onClose: () => void,
): void {
  'worklet';
  const current = motion.detent.value;
  if (!motion.dragged.value || current === 'closed') {
    return;
  }
  // The sheet's own movement, not the raw finger distance: a clamped or content-scrolled drag counts as seen.
  const movement = motion.top.value - motion.activationTop.value;
  const next = nextDetent(current, movement, velocityY, motion.positions.value);
  if (next === 'closed') {
    scheduleOnRN(onClose);
    return;
  }
  motion.detent.value = next;
  motion.top.value = withSpring(motion.positions.value[next], springConfig);
  scheduleOnRN(onDetent, next);
}

/** Records the content's scroll offset on the UI thread. */
export function recordScroll(scrollOffset: SharedValue<number>, offset: number): void {
  'worklet';
  scrollOffset.value = offset;
}

/** Marks whether the current touch is on the scrolling content. */
export function recordScrollTouch(scrollTouched: SharedValue<boolean>, touched: boolean): void {
  'worklet';
  scrollTouched.value = touched;
}
