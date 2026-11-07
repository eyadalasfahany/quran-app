import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/core/theme';

/**
 * The lit part of a moon disc of radius `r` (box 2r × 2r), as an SVG path. `illumination` is the lit fraction k (0…1).
 *
 * The lit region is bounded by the bright limb (a half circle on the lit side) and the terminator, a half ellipse with
 * x-radius r·|1 − 2k|: it bulges into the lit side for a crescent (k < ½) and away from it for a gibbous moon (k > ½).
 * Waxing is lit on the right and waning on the left, as seen from the northern hemisphere (the #MoonSighting frame).
 * The SVG is not mirrored in RTL, so the side is the sky's, not the layout's.
 */
export function moonLitPath(illumination: number, waxing: boolean, r: number): string {
  const k = Math.min(1, Math.max(0, illumination));
  const rx = r * Math.abs(1 - 2 * k);
  const crescent = k < 0.5;
  // Waxing: the limb runs clockwise from the top round the right edge; waning: anticlockwise round the left edge.
  const limbSweep = waxing ? 1 : 0;
  // The terminator returns bottom → top on the lit side for a crescent, on the dark side for a gibbous moon.
  const terminatorSweep = waxing === crescent ? 0 : 1;
  const d = 2 * r;
  return `M ${r} 0 A ${r} ${r} 0 0 ${limbSweep} ${r} ${d} A ${rx} ${r} 0 0 ${terminatorSweep} ${r} 0 Z`;
}

/** Moon disc drawn with SVG (screens/, #MoonSighting): the dark disc with the lit part on top. */
export function MoonPhaseDisc({
  illumination,
  waxing,
  size = 88,
  testID = 'moon-phase-disc',
}: {
  illumination: number;
  waxing: boolean;
  size?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const r = size / 2;
  // The lit part sits 2 inside the disc's edge, as the old masked disc did, so the hairline stays visible.
  const inset = 2;

  return (
    <Svg accessibilityRole="image" height={size} testID={testID} width={size}>
      <Circle cx={r} cy={r} fill={theme.colors.fillSecondary} r={r - 1} stroke={theme.colors.line} strokeWidth={1} />
      <Path
        d={moonLitPath(illumination, waxing, r - inset)}
        fill={theme.colors.gold}
        testID={`${testID}-lit`}
        transform={`translate(${inset}, ${inset})`}
      />
    </Svg>
  );
}
