import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/** The column's fixed parts, by name. The ayah card (or the error notice in its place) and the artwork are sized by fitPlayerColumn. */
export type PlayerPart = 'header' | 'title' | 'notice' | 'progress' | 'transport' | 'options';

/**
 * The player's measured heights: the window's height and each fixed part's natural height as its wrapper lays it out
 * (a part that is not on screen keeps no height).
 */
export function usePlayerMeasures() {
  const [screenHeight, setScreenHeight] = useState<number | null>(null);
  const [heights, setHeights] = useState<Partial<Record<PlayerPart, number>>>({});

  const onScreenLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setScreenHeight((previous) => (previous === height ? previous : height));
  }, []);

  const onPartLayout = useCallback((part: PlayerPart) => (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setHeights((previous) => (previous[part] === height ? previous : { ...previous, [part]: height }));
  }, []);

  const sumOf = (parts: readonly PlayerPart[]) => parts.reduce((total, part) => total + (heights[part] ?? 0), 0);

  return { onPartLayout, onScreenLayout, screenHeight, sumOf };
}
