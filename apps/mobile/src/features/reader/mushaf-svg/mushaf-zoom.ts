// Page zoom in Mushaf mode (ADR 0090 amendment, 26 Nov 2026, item 9). Pure: the stored value, the pinch and the stepper
// all go through here. Zoom is available only where the installed pack has word boxes and approved-or-pending contours.
import { clampMushafZoom, MUSHAF_ZOOM_STEP } from '../settings-model';

export { clampMushafZoom, MUSHAF_ZOOM_MAX, MUSHAF_ZOOM_MIN, MUSHAF_ZOOM_STEP } from '../settings-model';

/** The start level times the pinch scale, snapped to a 25% step and kept in [1, 2]. */
export function pinchMushafZoom(start: number, pinchScale: number): number {
  return clampMushafZoom(start * pinchScale);
}

export function stepMushafZoom(value: number, direction: -1 | 1): number {
  return clampMushafZoom(value + direction * MUSHAF_ZOOM_STEP);
}

/** True when the riwayah's pack carries word boxes and contour data (the pack reader's flags). */
export function zoomAvailable(pack: { hasWordBoxes: boolean; hasWordContours: boolean } | null): boolean {
  return pack !== null && pack.hasWordBoxes && pack.hasWordContours;
}

/**
 * The zoom in effect. The stored value is kept when a riwayah without word data is shown (switching back restores it);
 * such a page draws at 100%.
 */
export function effectiveZoom(stored: number, available: boolean): number {
  return available ? clampMushafZoom(stored) : 1;
}
