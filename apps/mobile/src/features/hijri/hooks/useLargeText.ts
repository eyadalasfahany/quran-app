import { PixelRatio } from 'react-native';

/**
 * The grid turns into a day list at large system text (ADR 0048 H3). `useTextScale()` is window-based (0.9 to 1.15), so it
 * cannot signal accessibility sizes; the system font scale is the signal here.
 */
export const LARGE_TEXT_FONT_SCALE = 1.3;

export function isLargeText(fontScale: number): boolean {
  return fontScale >= LARGE_TEXT_FONT_SCALE;
}

export function useLargeText(): boolean {
  return isLargeText(PixelRatio.getFontScale());
}
