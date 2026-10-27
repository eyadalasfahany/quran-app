import type { ColorTokens } from '@quran/design-tokens';

export type HighlightColor = 'gold' | 'green' | 'blue' | 'rose';

export const highlightColors: readonly HighlightColor[] = ['gold', 'green', 'blue', 'rose'];

// The colour token behind each user highlight; the one map every reader surface reads.
export const highlightToken: Record<HighlightColor, keyof ColorTokens> = {
  gold: 'highlightGold',
  green: 'highlightGreen',
  blue: 'highlightBlue',
  rose: 'highlightRose',
};

export function highlightFill(colors: ColorTokens, color: HighlightColor | null | undefined): string | undefined {
  return color ? colors[highlightToken[color]] : undefined;
}
