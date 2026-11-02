import { quranTypeScale, typeScale, type QuranTypeToken, type TypeToken } from '@quran/design-tokens';
import type { TextProps, TextStyle } from 'react-native';

import { displayFontFamilies, quranFontFamily, type UiTypeToken } from '@/core/theme';

export type DisplayTypeToken = Exclude<TypeToken, UiTypeToken>;

// Interface text follows the system text size up to these factors. Floating bars stay tighter so
// they never cover the page they float over.
export const maxFontScale = {
  bar: 1.5,
  content: 2,
} as const;

export function uiTextProps(
  token: UiTypeToken,
  scale: keyof typeof maxFontScale = 'content',
): Pick<TextProps, 'dynamicTypeRamp' | 'maxFontSizeMultiplier'> {
  return { dynamicTypeRamp: typeScale[token].ramp, maxFontSizeMultiplier: maxFontScale[scale] };
}

// `scale` is for display type that sits inside Quran text and follows the reader's setting.
export function displayText(token: DisplayTypeToken, scale = 1): TextStyle {
  const { size, lineHeight, weight } = typeScale[token];
  return { fontFamily: displayFontFamilies[weight], fontSize: size * scale, lineHeight: lineHeight * scale };
}

// Arabic text reads right to left and right-aligned in both languages, even in English (LTR) screens.
export const arabicTextDirection: TextStyle = {
  // iOS mirrors textAlign left/right to the layout direction. Keeping this
  // node LTR leaves 'right' on the physical right; the words still run RTL.
  direction: 'ltr',
  textAlign: 'right',
  writingDirection: 'rtl',
};

// Latin text (an English licence line) reads left to right and left-aligned in both languages, even in Arabic (RTL) screens.
export const latinTextDirection: TextStyle = {
  // Keeping this node LTR leaves 'left' on the physical left (iOS mirrors left/right to the layout direction).
  direction: 'ltr',
  textAlign: 'left',
  writingDirection: 'ltr',
};

// Quran text ignores the system text size and follows the reader's own 80–160% setting.
export function quranText(token: QuranTypeToken, fontScale = 1): TextStyle {
  const { size, lineHeightRatio } = quranTypeScale[token];
  const fontSize = size * fontScale;
  return {
    ...arabicTextDirection,
    fontFamily: quranFontFamily,
    fontSize,
    lineHeight: Math.round(fontSize * lineHeightRatio),
  };
}
