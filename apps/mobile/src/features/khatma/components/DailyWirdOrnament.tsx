import Svg, { Circle, Rect } from 'react-native-svg';

import { useTheme } from '@/core/theme';

const SIZE = 64;
const STROKE = 1.2;

// #Khatma daily card: 64×64 gold outline (square, square rotated 45°, circle) — not the Home rosette.
export function DailyWirdOrnament({ testID }: { testID?: string }) {
  const theme = useTheme();

  return (
    <Svg
      accessibilityElementsHidden
      height={SIZE}
      importantForAccessibility="no-hide-descendants"
      testID={testID}
      viewBox="0 0 64 64"
      width={SIZE}
    >
      <Rect fill="none" height={32} stroke={theme.colors.goldOnBrandSurface} strokeWidth={STROKE} width={32} x={16} y={16} />
      <Rect
        fill="none"
        height={32}
        stroke={theme.colors.goldOnBrandSurface}
        strokeWidth={STROKE}
        transform="rotate(45 32 32)"
        width={32}
        x={16}
        y={16}
      />
      <Circle cx={32} cy={32} fill="none" r={8} stroke={theme.colors.goldOnBrandSurface} strokeWidth={STROKE} />
    </Svg>
  );
}
