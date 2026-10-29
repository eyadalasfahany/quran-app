import type { PanelTab } from './selection';

/** Phone frames in quran-app-screens.html are 390×844. */
const PHONE_FRAME_HEIGHT = 844;

/** Side and bottom inset of the sheet card on those frames. */
export const SHEET_MARGIN = 8;

/** Card radius on the ayah and reader-settings frames. */
export const SHEET_RADIUS = 36;

/** Top-corner radius of the full-width tafsir sheet. */
export const FULL_SHEET_RADIUS = 28;

/** The mid detent sits at half the window height for every sheet (ADR 0020). */
export const MID_DETENT_RATIO = 0.5;

/** A drag moves the sheet to the next detent once it passes this share of the distance to it. */
export const DETENT_DISTANCE_RATIO = 0.25;

/** A release faster than this (pt/s) moves the sheet one detent in the flick's direction. */
export const DETENT_VELOCITY = 800;

/** The ayah card floats inset over the page; reading tafsir takes the tall, full-width sheet. */
export type SheetShape = 'card' | 'full';

export function sheetShapeFor(tab: PanelTab): SheetShape {
  return tab === 'actions' ? 'card' : 'full';
}

/** Where the sheet rests: the card's top edge, in window coordinates. */
export type Detent = 'full' | 'mid' | 'closed';

export type SheetDetents = { full: number; mid: number; closed: number };

/**
 * Card top for each detent. Full sits under the safe area with the card's margin;
 * mid is half the window; closed is the card fully below the bottom edge.
 */
export function sheetDetents(windowHeight: number, safeTop: number): SheetDetents {
  'worklet';
  const height = windowHeight > 0 ? windowHeight : PHONE_FRAME_HEIGHT;
  const full = Math.min(safeTop + SHEET_MARGIN, height);
  const mid = Math.min(Math.max(full, height * MID_DETENT_RATIO), height);
  return { closed: height, full, mid };
}

/**
 * The detent a drag or flick settles on. Positive translation and velocity point down.
 * A flick faster than DETENT_VELOCITY moves one detent in its direction. A slower drag
 * moves one detent once it passes DETENT_DISTANCE_RATIO of the distance to that detent.
 * The sheet never skips a detent, and a detent at the same position as the current one is passed over.
 */
export function nextDetent(current: Detent, translation: number, velocity: number, detents: SheetDetents): Detent {
  'worklet';
  if (current === 'closed') {
    return 'closed';
  }
  const fast = Math.abs(velocity) > DETENT_VELOCITY;
  const direction = fast ? Math.sign(velocity) : Math.sign(translation);
  if (direction === 0) {
    return current;
  }

  const order: Detent[] = ['full', 'mid', 'closed'];
  const from = detents[current];
  let target: Detent | null = null;
  for (let index = order.indexOf(current) + direction; index >= 0 && index < order.length; index += direction) {
    const candidate = order[index];
    if (candidate === undefined) {
      break;
    }
    const beyond = direction > 0 ? detents[candidate] > from : detents[candidate] < from;
    if (beyond) {
      target = candidate;
      break;
    }
  }
  if (target === null) {
    return current;
  }
  if (fast) {
    return target;
  }
  const distance = Math.abs(detents[target] - from);
  return Math.abs(translation) >= DETENT_DISTANCE_RATIO * distance ? target : current;
}

/**
 * A form sheet scales and pushes the screen behind it. A transparent modal leaves that screen
 * where it is. SheetHost slides the card itself, and the stack's own animation and swipe are off,
 * so closing never fades over the card's slide.
 */
export const sheetScreenOptions = {
  animation: 'none' as const,
  contentStyle: { backgroundColor: 'transparent' as const },
  gestureEnabled: false,
  headerShown: false,
  presentation: 'transparentModal' as const,
};
