import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/** The column's fixed parts, by name. The ayah card (or the error notice in its place) is measured by the card itself. */
export type PlayerPart = 'header' | 'artwork' | 'title' | 'notice' | 'progress' | 'transport' | 'options';

/**
 * The player's measured heights: the window's height, each fixed part's natural height as its wrapper lays it out
 * (a part that is not on screen keeps no height), and the ayah card's natural height as the card reports it.
 */
export function usePlayerMeasures() {
  const [screenHeight, setScreenHeight] = useState<number | null>(null);
  const [heights, setHeights] = useState<Partial<Record<PlayerPart, number>>>({});
  const [cardNatural, setCardNatural] = useState<number | null>(null);

  const onScreenLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setScreenHeight((previous) => (previous === height ? previous : height));
  }, []);

  const onPartLayout = useCallback((part: PlayerPart) => (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setHeights((previous) => (previous[part] === height ? previous : { ...previous, [part]: height }));
  }, []);

  const sumOf = (parts: readonly PlayerPart[]) => parts.reduce((total, part) => total + (heights[part] ?? 0), 0);

  return { cardNatural, onCardNatural: setCardNatural, onPartLayout, onScreenLayout, screenHeight, sumOf };
}
