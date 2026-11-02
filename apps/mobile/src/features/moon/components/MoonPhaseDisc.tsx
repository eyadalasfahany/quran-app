import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';

import { useTheme } from '@/core/theme';

/**
 * Moon disc drawn with SVG (quran-app-screens.html, #MoonSighting). Phase via mask, not layout offsets.
 */
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
  const lit = Math.min(1, Math.max(0, illumination));
  const offset = (1 - lit) * size;
  const maskCx = waxing ? r - offset + r : r + offset - r;

  return (
    <Svg accessibilityRole="image" height={size} testID={testID} width={size}>
      <Circle cx={r} cy={r} fill={theme.colors.fillSecondary} r={r - 1} stroke={theme.colors.line} strokeWidth={1} />
      <Defs>
        <Mask id="moonLit">
          <Rect fill="black" height={size} width={size} x={0} y={0} />
          <Circle cx={maskCx} cy={r} fill="white" r={r} />
        </Mask>
      </Defs>
      <Circle cx={r} cy={r} fill={theme.colors.gold} mask="url(#moonLit)" r={r - 2} />
    </Svg>
  );
}
