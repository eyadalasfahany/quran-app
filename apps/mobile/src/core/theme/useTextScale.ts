import { textScaleFor } from '@quran/design-tokens';
import { useWindowDimensions } from 'react-native';

// The interface text factor for this window (ADR 0043). Components never multiply by it themselves:
// UiText and theme.text already apply it.
export function useTextScale(): number {
  const { width, height } = useWindowDimensions();
  return textScaleFor({ width, height });
}
