import { DETENT_DISTANCE_RATIO, DETENT_VELOCITY } from '@/features/reader/form-sheet';

/**
 * How far the full player must be dragged down to close: the same quarter of the window as a sheet
 * detent (ADR 0020). The constants live in `form-sheet.ts` so the two never drift apart.
 */
export function dismissDistance(windowHeight: number): number {
  'worklet';
  return windowHeight * DETENT_DISTANCE_RATIO;
}

/**
 * Whether a released drag closes the player: it has been dragged down past the dismiss distance, or it
 * was flicked down faster than DETENT_VELOCITY. Positive translation and velocity point down, so an
 * upward drag or flick never closes.
 */
export function shouldDismiss(translation: number, velocityY: number, windowHeight: number): boolean {
  'worklet';
  if (velocityY > DETENT_VELOCITY) {
    return true;
  }
  return translation > 0 && translation >= dismissDistance(windowHeight);
}

/**
 * The player's offset during a drag. It moves with the finger from where it was when the pan
 * activated (`anchor` at `anchorY`), and holds at the top for an upward drag rather than rising
 * above the window.
 */
export function dragOffset(anchor: number, anchorY: number, translationY: number): number {
  'worklet';
  return Math.max(0, anchor + translationY - anchorY);
}
