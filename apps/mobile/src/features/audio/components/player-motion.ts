import { withSpring, withTiming, type SharedValue, type WithSpringConfig } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { timing } from '@/core/theme';

import { dragOffset, shouldDismiss } from './player-dismiss';

/**
 * The shared values one drag reads and writes: the player's offset, and where the drag began (the
 * offset and the finger's position when the pan activated). The helpers below mutate them; the
 * component only passes them in, which keeps the writes out of the component body.
 */
export type PlayerDrag = {
  offset: SharedValue<number>;
  anchor: SharedValue<number>;
  anchorY: SharedValue<number>;
};

/** Moves a value with the spring. `onSettled` runs once it has finished, not when it is interrupted. */
export function springValue(
  value: SharedValue<number>,
  target: number,
  config: WithSpringConfig,
  onSettled?: () => void,
): void {
  'worklet';
  value.value = withSpring(target, config, (finished) => {
    if (finished && onSettled !== undefined) {
      scheduleOnRN(onSettled);
    }
  });
}

/** Fades a value with the slow timing; Reduce Motion uses it in place of the slide. */
export function fadeValue(value: SharedValue<number>, target: number, onSettled?: () => void): void {
  value.value = withTiming(target, timing('slow'), (finished) => {
    if (finished && onSettled !== undefined) {
      scheduleOnRN(onSettled);
    }
  });
}

/** A pan begins: remember where the player was and where the finger was. */
export function beginPlayerDrag(drag: PlayerDrag, translationY: number): void {
  'worklet';
  drag.anchor.value = drag.offset.value;
  drag.anchorY.value = translationY;
}

/**
 * The pan moves the player with the finger. While the touch is scrolling the content (`scrolling`),
 * the player holds still and the anchor follows the finger, so the content scrolls and a drag back
 * to the top does not jump.
 */
export function followPlayerDrag(drag: PlayerDrag, translationY: number, scrolling: boolean): void {
  'worklet';
  if (scrolling) {
    drag.anchor.value = drag.offset.value;
    drag.anchorY.value = translationY;
    return;
  }
  drag.offset.value = dragOffset(drag.anchor.value, drag.anchorY.value, translationY);
}

/**
 * The pan ends: close when the release passes the dismiss distance or flicks down fast, otherwise
 * spring back to the top. A pan that never moved the player (a tap, or a drag on scrolled content)
 * has nothing to settle.
 */
export function releasePlayerDrag(
  drag: PlayerDrag,
  velocityY: number,
  windowHeight: number,
  config: WithSpringConfig,
  onClose: () => void,
): void {
  'worklet';
  if (drag.offset.value <= 0) {
    return;
  }
  if (shouldDismiss(drag.offset.value, velocityY, windowHeight)) {
    scheduleOnRN(onClose);
    return;
  }
  springValue(drag.offset, 0, config);
}

/** Records whether the current touch is on the scrolling content. */
export function recordScrollTouch(scrollTouched: SharedValue<boolean>, touched: boolean): void {
  'worklet';
  scrollTouched.value = touched;
}

/** Records the content's scroll offset on the UI thread. */
export function recordScroll(scrollOffset: SharedValue<number>, offset: number): void {
  'worklet';
  scrollOffset.value = offset;
}
