import {
  scaleFontSize,
  scaleLineHeight,
  typeScale,
  type ColorTokens,
  type FontWeight,
  type TypeToken,
} from '@quran/design-tokens';
import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { displayFontFamilies, uiFontFamilies, useTextScale } from '@/core/theme';

import { maxFontScale } from './textStyles';
import { useContrastColors } from './useContrastColors';

// onBrand is the ink on a brand button (colors.onBrand); onBrandSurface is the text on a brand card (colors.onBrandSurface).
export type TextTone = 'ink' | 'muted' | 'brand' | 'danger' | 'onBrand' | 'onBrandSurface' | 'onBrandMuted' | 'goldInk';

const toneColor: Record<TextTone, keyof ColorTokens> = {
  ink: 'ink',
  muted: 'inkMuted',
  brand: 'brand',
  danger: 'danger',
  onBrand: 'onBrand',
  onBrandSurface: 'onBrandSurface',
  onBrandMuted: 'onBrandSurfaceMuted',
  goldInk: 'goldInk',
};

export function textToneColor(colors: ColorTokens, tone: TextTone): string {
  return colors[toneColor[tone]];
}

// Every interface and display string. The weight picks the font file; `fontWeight` is never set.
export function UiText({
  variant = 'body',
  tone = 'ink',
  weight,
  scale = 'content',
  align,
  style,
  children,
  ...rest
}: {
  variant?: TypeToken;
  tone?: TextTone;
  // The frames sometimes draw a style at another weight, for example caption at 600.
  weight?: FontWeight;
  // 'bar' for text on floating bars, which must not grow over the page.
  scale?: keyof typeof maxFontScale;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
} & Omit<TextProps, 'style'>) {
  const colors = useContrastColors();
  const token = typeScale[variant];
  const ui = token.family === 'ui';
  const resolvedWeight = weight ?? token.weight;
  const fontFamily = ui ? uiFontFamilies[resolvedWeight] : displayFontFamilies[resolvedWeight >= 600 ? 700 : 400];
  const factor = useTextScale();
  // UiText is the one place the window text factor is applied (ADR 0043), to the final size, token or override alike.
  const flat = (StyleSheet.flatten([
    // 'left' is the start edge: React Native flips it to the right under RTL. Natural alignment would instead follow
    // the language iOS picked at launch, which lags an in-app language switch until the next cold start.
    { color: textToneColor(colors, tone), fontFamily, fontSize: token.size, lineHeight: token.lineHeight, textAlign: 'left' },
    align ? { textAlign: align } : null,
    style,
  ]) ?? {}) as TextStyle;
  const textStyle: TextStyle = {
    ...flat,
    fontSize: factor !== 1 && typeof flat.fontSize === 'number' ? scaleFontSize(flat.fontSize, factor) : flat.fontSize,
    lineHeight: factor !== 1 && typeof flat.lineHeight === 'number' ? scaleLineHeight(flat.lineHeight, factor) : flat.lineHeight,
  };

  return (
    <Text
      dynamicTypeRamp={'ramp' in token ? token.ramp : undefined}
      maxFontSizeMultiplier={maxFontScale[scale]}
      {...rest}
      style={textStyle}
    >
      {children}
    </Text>
  );
}
