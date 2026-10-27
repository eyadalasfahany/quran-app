import {
  blur,
  colors,
  opacity,
  radius,
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

function uiText(): Record<UiTypeToken, TextStyle> {
  return Object.fromEntries(
    uiTypeTokens.map((token) => {
      const { size: fontSize, lineHeight, weight } = typeScale[token];
      return [token, { fontFamily: uiFontFamilies[weight], fontSize, lineHeight }];
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

export const themes = Object.fromEntries(themeNames.map((name) => [name, createTheme(name)])) as Record<
  ThemeName,
  Theme
>;
