import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { cancelAnimation, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { pulseTiming } from '@/core/theme';

import { SkeletonPulseContext } from './skeleton-context';

// The pulse dips to this opacity and back (screens/, #loading).
const PULSE_OPACITY = 0.55;

// A loading region: its SkeletonBlocks pulse together, and it is one accessibility element labelled
// «جارٍ التحميل» and busy. Its bars are hidden from screen readers. With Reduce Motion on, the bars stay still at 1.
export function SkeletonGroup({
  children,
  style,
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 1;
      return undefined;
    }
    pulse.value = withRepeat(withTiming(PULSE_OPACITY, pulseTiming()), -1, true);
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  return (
    <SkeletonPulseContext.Provider value={pulse}>
      <View accessible accessibilityLabel={t('ui.loading')} accessibilityState={{ busy: true }} style={style} testID={testID}>
        {children}
      </View>
    </SkeletonPulseContext.Provider>
  );
}
