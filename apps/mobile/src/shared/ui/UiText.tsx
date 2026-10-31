import { typeScale, type ColorTokens, type FontWeight, type TypeToken } from '@quran/design-tokens';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { displayFontFamilies, uiFontFamilies } from '@/core/theme';

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

  return (
    <Text
      dynamicTypeRamp={'ramp' in token ? token.ramp : undefined}
      maxFontSizeMultiplier={maxFontScale[scale]}
      {...rest}
      style={[
        { color: textToneColor(colors, tone), fontFamily, fontSize: token.size, lineHeight: token.lineHeight },
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
