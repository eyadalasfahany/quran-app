import type { ThemeName } from '@quran/design-tokens';

import { seerahArt, type SeerahArtLevel } from './seerah-art.generated';

/** The art of a level for a theme: dark has its own twin; light and sepia share the light art. Null for a level with no art. */
export function seerahArtFor(levelId: string, theme: ThemeName): string | null {
  const level = seerahArt[levelId as SeerahArtLevel] as { light: string; dark: string } | undefined;
  if (level === undefined) {
    return null;
  }
  return theme === 'dark' ? level.dark : level.light;
}
