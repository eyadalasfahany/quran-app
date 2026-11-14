import Animated, { useAnimatedProps, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { G, Path } from 'react-native-svg';

import { useTheme } from '@/core/theme';

import type { SeerahRouteKind } from '../types';

/** Screen-point stroke widths and dashes per route kind (frame SeerahMapKey). SeerahMap divides them by the zoom. */
export const ROUTE_STYLE: Record<SeerahRouteKind, { width: number; dash: number[] | null; round: boolean }> = {
  hijra: { width: 4, dash: null, round: false },
  taif: { width: 2.5, dash: [8, 5], round: false },
  trip: { width: 2.5, dash: [0.5, 7], round: true },
  habasha: { width: 3, dash: [10, 6], round: false },
  ghazwa: { width: 2.5, dash: [8, 5], round: false },
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * The stroke widths and dash for a route at a zoom: in content units, so a screen width of N points is N / scale units. A
 * worklet, so the UI thread evaluates it on every frame of a pinch.
 */
export function routeStroke(kind: SeerahRouteKind, scale: number): { halo: number; width: number; dash: string | undefined } {
  'worklet';
  const style = ROUTE_STYLE[kind];
  return {
    dash: style.dash === null ? undefined : style.dash.map((part) => (part / scale) * (style.round ? style.width : 1)).join(' '),
    halo: (style.width + 3) / scale,
    width: style.width / scale,
  };
}

/**
 * One journey's curve, drawn inside the map's SVG layer (render it as a child of `Svg`). `scale` is the map's live zoom as a
 * shared value: the stroke is divided by it on the UI thread, so a pinch keeps the line at its screen width while the layer
 * scales (a plain state value would only catch up when the gesture ends). `dimmed` fades it when the timeline's year does not
 * include its events.
 */
export function RouteLine({
  d,
  kind,
  scale,
  dimmed = false,
  testID,
}: {
  d: string;
  kind: SeerahRouteKind;
  scale?: SharedValue<number>;
  dimmed?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const fallback = useSharedValue(1);
  const live = scale ?? fallback;
  const stroke = {
    hijra: theme.colors.brand,
    taif: theme.colors.brand,
    trip: theme.colors.inkMuted,
    habasha: theme.colors.chartBlue,
    ghazwa: theme.colors.gold,
  }[kind];
  const haloProps = useAnimatedProps(() => ({ strokeWidth: routeStroke(kind, live.value).halo }));
  const strokeProps = useAnimatedProps(() => {
    const stroke = routeStroke(kind, live.value);
    return { strokeDasharray: stroke.dash, strokeWidth: stroke.width };
  });

  return (
    <G opacity={dimmed ? theme.opacity.focusAside : 1} testID={testID}>
      <AnimatedPath
        animatedProps={haloProps}
        d={d}
        fill="none"
        opacity={0.85}
        stroke={theme.colors.surfacePage}
        strokeLinecap="round"
        strokeLinejoin="round"
        testID={testID ? `${testID}-halo` : undefined}
      />
      <AnimatedPath
        animatedProps={strokeProps}
        d={d}
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        testID={testID ? `${testID}-stroke` : undefined}
      />
    </G>
  );
}
