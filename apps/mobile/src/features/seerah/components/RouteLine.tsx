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

/**
 * One journey's curve, drawn inside the map's SVG layer (render it as a child of `Svg`). `scale` is the map's zoom, so a
 * line keeps its screen width; `dimmed` fades it when the timeline's year does not include its events.
 */
export function RouteLine({
  d,
  kind,
  scale = 1,
  dimmed = false,
  testID,
}: {
  d: string;
  kind: SeerahRouteKind;
  scale?: number;
  dimmed?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const style = ROUTE_STYLE[kind];
  const stroke = {
    hijra: theme.colors.brand,
    taif: theme.colors.brand,
    trip: theme.colors.inkMuted,
    habasha: theme.colors.chartBlue,
    ghazwa: theme.colors.gold,
  }[kind];
  const unit = 1 / scale;

  return (
    <G opacity={dimmed ? theme.opacity.focusAside : 1} testID={testID}>
      <Path
        d={d}
        fill="none"
        opacity={0.85}
        stroke={theme.colors.surfacePage}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={(style.width + 3) * unit}
        testID={testID ? `${testID}-halo` : undefined}
      />
      <Path
        d={d}
        fill="none"
        stroke={stroke}
        strokeDasharray={style.dash === null ? undefined : style.dash.map((part) => part * unit * (style.round ? style.width : 1)).join(' ')}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={style.width * unit}
        testID={testID ? `${testID}-stroke` : undefined}
      />
    </G>
  );
}
