import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { formatNumber } from '@/core/i18n';
import { useLocale } from '@/core/i18n/useLocale';
import { spring, timing, useTheme } from '@/core/theme';
import { Icon, UiText } from '@/shared/ui';

export const COUNTER_SIZE = 120;
/** The ring in a short window (a landscape phone), so the dhikr keeps room to read. Still well above the 44 pt target. */
export const COUNTER_SIZE_COMPACT = 88;
const STROKE = 6;
/** The bump on each count, and the larger one on completion. A spring settles it back to 1 (Reduce Motion: none). */
const TAP_SCALE = 1.04;
const PULSE_SCALE = 1.08;
const CHECK = { ios: 'checkmark', android: 'check' } as const;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * The control for every dhikr unit (ADR 0031 §6, developer 1 Nov 2026): a 120 pt button with a ring.
 * - A sourced count above 1: «٢ من ٣» in the centre, the ring filling per count.
 * - A sourced count of 1: the same ring, «٠ من ١» then «١ من ١», completing on one tap.
 * - No sourced count (`requiredCount` null): the single variant. An empty ring with a check and «تم» in the centre;
 *   one tap fills the ring and completes. No number is shown, because a missing count is never read as 1.
 *
 * `compact` (a short window) draws an 88 pt ring with smaller centre text and no caption under it; the hint stays on
 * the button for VoiceOver and TalkBack.
 *
 * Each count bumps the ring with a spring; completion pulses it. Reduce Motion: the ring jumps to its state, and nothing
 * scales. A reset action clears this unit's progress.
 */
export function AzkarCounter({
  position,
  value,
  requiredCount,
  completed = false,
  compact = false,
  onTap,
  onReset,
  testID = 'azkar-counter',
}: {
  /** The dhikr's position in the reader, 1-based. */
  position: number;
  /** The count so far. Ignored by the single variant. */
  value: number;
  /** The sourced count, or null for the single variant. Never read as 1 (ADR 0031 §6). */
  requiredCount: number | null;
  /** Whether the unit is done. Only the single variant reads it for its ring; the counter fills from `value`. */
  completed?: boolean;
  /** A short window: the smaller ring, with no caption. */
  compact?: boolean;
  onTap: () => void;
  onReset: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const single = requiredCount === null;
  const size = compact ? COUNTER_SIZE_COMPACT : COUNTER_SIZE;
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = single ? 0 : Math.min(Math.max(value, 0), requiredCount);
  const target = single ? (completed ? 1 : 0) : requiredCount === 0 ? 0 : clamped / requiredCount;
  const progress = useSharedValue(target);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = target;
      return;
    }
    progress.value = withTiming(target, timing('standard'));
  }, [progress, reduceMotion, target]);

  // A count bumps the ring; the first completion pulses it. The first render and a reset do nothing.
  const previous = useRef({ count: clamped, completed });
  useEffect(() => {
    const before = previous.current;
    previous.current = { count: clamped, completed };
    if (reduceMotion) {
      scale.value = 1;
      return;
    }
    if (completed && !before.completed) {
      scale.value = PULSE_SCALE;
      scale.value = withSpring(1, spring());
    } else if (clamped > before.count) {
      scale.value = TAP_SCALE;
      scale.value = withSpring(1, spring());
    }
  }, [clamped, completed, reduceMotion, scale]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const valueText = single
    ? undefined
    : t('azkar.counter.value', {
        current: formatNumber(clamped, locale),
        total: formatNumber(requiredCount, locale),
      });

  return (
    <View style={{ alignItems: 'center', gap: theme.space[2] }}>
      <Pressable
        accessibilityActions={[{ label: t('azkar.counter.reset'), name: 'reset' }]}
        accessibilityHint={single ? t('azkar.counter.doneHint') : t('azkar.counter.hint')}
        accessibilityLabel={single ? t('azkar.counter.doneLabel') : t('azkar.counter.label', { position: formatNumber(position, locale) })}
        accessibilityRole="button"
        accessibilityValue={valueText === undefined ? undefined : { text: valueText }}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'reset') {
            onReset();
          }
        }}
        onPress={onTap}
        style={{ height: size, width: size }}
        testID={testID}
      >
        <View
          style={{
            alignItems: 'center',
            height: size,
            justifyContent: 'center',
            width: size,
          }}
        >
          <Svg height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }} width={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              fill={theme.colors.surfaceRaised}
              r={radius}
              stroke={theme.colors.line}
              strokeWidth={STROKE}
            />
            <AnimatedCircle
              animatedProps={animatedProps}
              cx={size / 2}
              cy={size / 2}
              fill="none"
              r={radius}
              stroke={theme.colors.brand}
              strokeDasharray={circumference}
              strokeLinecap="round"
              strokeWidth={STROKE}
              testID={`${testID}-ring`}
            />
          </Svg>
          <Animated.View style={scaleStyle}>
            {single ? (
              <View style={{ alignItems: 'center', gap: theme.space[1] }}>
                <Icon color={theme.colors.brand} name={CHECK} size={compact ? 24 : 32} testID={`${testID}-check`} />
                <UiText align="center" testID={`${testID}-done`} variant="subhead">
                  {t('azkar.reader.done')}
                </UiText>
              </View>
            ) : (
              <UiText align="center" testID={`${testID}-value`} variant={compact ? 'headline' : 'displaySm'}>
                {valueText}
              </UiText>
            )}
          </Animated.View>
        </View>
      </Pressable>
      {compact ? null : (
        <UiText align="center" importantForAccessibility="no" tone="muted" variant="caption">
          {single ? t('azkar.counter.doneHint') : t('azkar.counter.hint')}
        </UiText>
      )}
    </View>
  );
}
