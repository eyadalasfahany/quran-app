// Which Mushaf view shows, and how a pinch moves the text size (developer, 15 Nov 2026). Pure.
import type { SvgMushafKey } from '@/core/mushaf-pack';

import { clampFontScale } from '../settings-model';

export type MushafView = 'svg' | 'flowed';

/**
 * The printed pages at 1× and below; above 1× the flowed Hafs text, whose words grow and wrap freely. The flowed text
 * is Tanzil Hafs, so another riwayah keeps its printed pages at every size.
 */
export function mushafView(input: { svgShown: boolean; fontScale: number; mushafKey: SvgMushafKey }): MushafView {
  return input.svgShown && (input.fontScale <= 1 || input.mushafKey !== 'hafs') ? 'svg' : 'flowed';
}

/**
 * The text size a pinch asks for: the size at the pinch's start times the pinch scale, snapped to the 0.1 grid and kept
 * within [0.8, max]. A start already above the cap holds there, so a pinch never moves the size against the fingers.
 */
export function pinchFontScale(start: number, pinchScale: number, max: number): number {
  return Math.min(clampFontScale(start * pinchScale), Math.max(max, start));
}
