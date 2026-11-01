import {
  blur,
  colors,
  opacity,
  radius,
  scaleTextStyle,
  shadows,
  size,
  space,
  stroke,
  themeNames,
  typeScale,
  type ColorTokens,
  type ShadowTokens,
  type ThemeName,
  type TypeToken,
} from '@quran/design-tokens';
import type { TextStyle } from 'react-native';

import { uiFontFamilies } from './fonts';

export type UiTypeToken = {
  [K in TypeToken]: (typeof typeScale)[K]['family'] extends 'ui' ? K : never;
}[TypeToken];

export type Theme = {
  name: ThemeName;
  colors: ColorTokens;
  shadows: ShadowTokens;
  space: typeof space;
  radius: typeof radius;
  size: typeof size;
  stroke: typeof stroke;
  opacity: typeof opacity;
  blur: typeof blur;
  text: Record<UiTypeToken, TextStyle>;
};

const uiTypeTokens = (Object.keys(typeScale) as TypeToken[]).filter(
  (token): token is UiTypeToken => typeScale[token].family === 'ui',
);

function uiText(factor = 1): Record<UiTypeToken, TextStyle> {
  return Object.fromEntries(
    uiTypeTokens.map((token) => {
      const { size, lineHeight, weight } = typeScale[token];
      const scaled = scaleTextStyle({ size, lineHeight }, factor);
      return [token, { fontFamily: uiFontFamilies[weight], fontSize: scaled.size, lineHeight: scaled.lineHeight }];
    }),
  ) as Record<UiTypeToken, TextStyle>;
}

function createTheme(name: ThemeName): Theme {
  return {
    name,
    colors: colors[name],
    shadows: shadows[name],
    space,
    radius,
    size,
    stroke,
    opacity,
    blur,
    text: uiText(),
  };
}

// The window text factor (ADR 0043) applies to the UI text styles only; a factor of 1 keeps the theme as it is.
export function withTextScale(theme: Theme, factor: number): Theme {
  return factor === 1 ? theme : { ...theme, text: uiText(factor) };
}

export const themes = Object.fromEntries(themeNames.map((name) => [name, createTheme(name)])) as Record<
  ThemeName,
  Theme
>;
