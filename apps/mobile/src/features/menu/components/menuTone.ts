import type { ColorTokens } from '@quran/design-tokens';

/** A menu section's colour (screens/frames/menu, #MenuSections). */
export type MenuTone = 'green' | 'gold' | 'blue' | 'rose' | 'neutral';

const TOKENS = {
  green: ['tileGreen', 'tileGreenInk'],
  gold: ['tileGold', 'tileGoldInk'],
  blue: ['tileBlue', 'tileBlueInk'],
  rose: ['tileRose', 'tileRoseInk'],
  neutral: ['tileNeutral', 'tileNeutralInk'],
} as const satisfies Record<MenuTone, readonly [keyof ColorTokens, keyof ColorTokens]>;

/** The icon tile's fill and the ink drawn on it (and used for the section title and progress bar). */
export function menuToneColors(colors: ColorTokens, tone: MenuTone): { tile: string; ink: string } {
  const [tile, ink] = TOKENS[tone];
  return { tile: colors[tile], ink: colors[ink] };
}
