import {
  amiriNaturalLeading,
  scaleFontSize,
  scaleLineHeight,
  typeScale,
  type ColorTokens,
  type FontWeight,
  type TypeToken,
} from '@quran/design-tokens';
import { StyleSheet, Text, useWindowDimensions, type StyleProp, type TextProps, type TextStyle } from 'react-native';

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

// iOS clips Amiri glyphs above a short line box; the padding gives them room and the negative margin keeps the layout.
function amiriClipPad(style: TextStyle, fontScale: number, cap: number): number {
  if (typeof style.fontSize !== 'number' || typeof style.lineHeight !== 'number') {
    return 0;
  }
  const shortfall = style.fontSize * amiriNaturalLeading - style.lineHeight;
  return shortfall <= 0 ? 0 : Math.ceil((shortfall / 2) * Math.min(Math.max(fontScale, 1), cap));
}

const num = (value: unknown): number => (typeof value === 'number' ? value : 0);

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
  const { fontScale } = useWindowDimensions();
  // UiText is the one place the window text factor is applied (ADR 0043), to the final size, token or override alike.
  // 'left' is the start edge: React Native flips it to the right under RTL. Natural alignment would instead follow
  // the language iOS picked at launch, which lags an in-app language switch until the next cold start.
  const base: TextStyle = {
    color: textToneColor(colors, tone),
    fontFamily,
    fontSize: token.size,
    lineHeight: token.lineHeight,
    textAlign: 'left',
  };
  const alignment: TextStyle | null = align ? { textAlign: align } : null;
  const userStyle =
    style != null && style !== false ? (StyleSheet.flatten(style as TextStyle | TextStyle[]) as TextStyle) : undefined;
  const flat: TextStyle = { ...base, ...alignment, ...userStyle };
  const textStyle: TextStyle = {
    ...flat,
    fontSize: factor !== 1 && typeof flat.fontSize === 'number' ? scaleFontSize(flat.fontSize, factor) : flat.fontSize,
    lineHeight: factor !== 1 && typeof flat.lineHeight === 'number' ? scaleLineHeight(flat.lineHeight, factor) : flat.lineHeight,
  };
  const lift = ui ? 0 : amiriClipPad(textStyle, fontScale, maxFontScale[scale]);
  const fitted: TextStyle =
    lift === 0
      ? textStyle
      : {
          ...textStyle,
          paddingTop: num(flat.paddingTop ?? flat.paddingVertical ?? flat.padding) + lift,
          paddingBottom: num(flat.paddingBottom ?? flat.paddingVertical ?? flat.padding) + lift,
          marginTop: num(flat.marginTop ?? flat.marginVertical ?? flat.margin) - lift,
          marginBottom: num(flat.marginBottom ?? flat.marginVertical ?? flat.margin) - lift,
        };

  return (
    <Text
      dynamicTypeRamp={'ramp' in token ? token.ramp : undefined}
      maxFontSizeMultiplier={maxFontScale[scale]}
      {...rest}
      style={fitted}
    >
      {children}
    </Text>
  );
}
