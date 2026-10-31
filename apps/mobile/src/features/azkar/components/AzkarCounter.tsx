import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

import { formatNumber } from '@/core/i18n';
import { useLocale } from '@/core/i18n/useLocale';
import { timing, useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

export const COUNTER_SIZE = 120;
const STROKE = 6;
const RADIUS = (COUNTER_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * The count of a dhikr with a sourced repeat count: a 120 pt button with a ring, «٢ من ٣» in the centre.
 * Reduce Motion: the ring jumps to its state without animation. A reset action clears this unit's count.
 */
export function AzkarCounter({
  position,
  value,
  requiredCount,
  onTap,
  onReset,
  testID = 'azkar-counter',
}: {
  /** The dhikr's position in the reader, 1-based. */
  position: number;
  value: number;
  requiredCount: number;
  onTap: () => void;
  onReset: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const clamped = Math.min(Math.max(value, 0), requiredCount);
  const target = requiredCount === 0 ? 0 : clamped / requiredCount;
  const progress = useSharedValue(target);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = target;
      return;
    }
    progress.value = withTiming(target, timing('standard'));
  }, [progress, reduceMotion, target]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const valueText = t('azkar.counter.value', {
    current: formatNumber(clamped, locale),
    total: formatNumber(requiredCount, locale),
  });

  return (
    <Pressable
      accessibilityActions={[{ label: t('azkar.counter.reset'), name: 'reset' }]}
      accessibilityHint={t('azkar.counter.hint')}
      accessibilityLabel={t('azkar.counter.label', { position: formatNumber(position, locale) })}
      accessibilityRole="button"
      accessibilityValue={{ text: valueText }}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'reset') {
          onReset();
        }
      }}
      onPress={onTap}
      style={{ height: COUNTER_SIZE, width: COUNTER_SIZE }}
      testID={testID}
    >
      <View style={{ alignItems: 'center', height: COUNTER_SIZE, justifyContent: 'center', width: COUNTER_SIZE }}>
        <Svg height={COUNTER_SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }} width={COUNTER_SIZE}>
          <Circle
            cx={COUNTER_SIZE / 2}
            cy={COUNTER_SIZE / 2}
            fill={theme.colors.surfaceRaised}
            r={RADIUS}
            stroke={theme.colors.line}
            strokeWidth={STROKE}
          />
          <AnimatedCircle
            animatedProps={animatedProps}
            cx={COUNTER_SIZE / 2}
            cy={COUNTER_SIZE / 2}
            fill="none"
            r={RADIUS}
            stroke={theme.colors.brand}
            strokeDasharray={CIRCUMFERENCE}
            strokeLinecap="round"
            strokeWidth={STROKE}
            testID={`${testID}-ring`}
          />
        </Svg>
        <UiText align="center" testID={`${testID}-value`} variant="displaySm">
          {valueText}
        </UiText>
      </View>
    </Pressable>
  );
}
