import { View } from 'react-native';
import Svg, { Circle, G, Rect } from 'react-native-svg';

import { useTheme } from '@/core/theme';

/** Decorative header pattern (quran-app-screens.html, #OnboardLanguage). */
export function OnboardingHeroPattern({ testID = 'onboarding-hero-pattern' }: { testID?: string }) {
  const theme = useTheme();
  const stroke = theme.colors.gold;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ height: 340, width: '100%' }}
      testID={testID}
    >
      <Svg fill="none" height={340} stroke={stroke} strokeWidth={1} viewBox="0 0 390 340" width="100%">
        <G transform="translate(195 190)">
          <Rect height={140} width={140} x={-70} y={-70} />
          <Rect height={140} transform="rotate(45)" width={140} x={-70} y={-70} />
          <Rect height={88} width={88} x={-44} y={-44} />
          <Rect height={88} transform="rotate(45)" width={88} x={-44} y={-44} />
          <Circle r={24} />
        </G>
      </Svg>
    </View>
  );
}
