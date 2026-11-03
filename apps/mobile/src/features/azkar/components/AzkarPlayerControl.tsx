import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { timing, useTheme } from '@/core/theme';
import { BufferingRing } from '@/shared/ui/BufferingRing';
import { Icon, type IconName } from '@/shared/ui';

const PLAY = { ios: 'play.fill', android: 'play_arrow' } as const satisfies IconName;
const PAUSE = { ios: 'pause.fill', android: 'pause' } as const satisfies IconName;

const AnimatedView = Animated.View;

/**
 * The play and pause control of the Azkar player (ADR 0031 §8). The two glyphs morph: as one fades out the other fades
 * in and settles from a slightly smaller size. Reduce Motion swaps them at once. The control is a 44 pt target in the
 * reader's bar, and a larger one in the full player.
 */
export function AzkarPlayerControl({
  playing,
  loading = false,
  onPress,
  size = 'bar',
  disabled = false,
  testID = 'azkar-player-control',
}: {
  playing: boolean;
  /** Audio is starting: pause glyph and a buffering ring, like the Mushaf player (ADR 0047). */
  loading?: boolean;
  onPress: () => void;
  size?: 'bar' | 'sheet';
  disabled?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const showPause = playing || loading;
  // 0 shows the play glyph, 1 the pause glyph.
  const progress = useSharedValue(showPause ? 1 : 0);

  useEffect(() => {
    progress.value = reduceMotion ? (showPause ? 1 : 0) : withTiming(showPause ? 1 : 0, timing('fast'));
  }, [showPause, progress, reduceMotion]);

  const playStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: 1 - 0.2 * progress.value }],
  }));
  const pauseStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.8 + 0.2 * progress.value }],
  }));

  const dimension = size === 'sheet' ? theme.size.touchTarget + theme.space[8] : theme.size.touchTarget;
  const glyph = size === 'sheet' ? theme.size.iconLg + theme.space[2] : theme.size.iconMd;

  return (
    <BufferingRing active={loading} color={theme.colors.onBrand} size={dimension} testID={`${testID}-ring`}>
      <Pressable
        accessibilityLabel={showPause ? t('azkar.audio.pause') : t('azkar.audio.play')}
        accessibilityRole="button"
        accessibilityState={{ disabled, busy: loading || undefined }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: theme.colors.brand,
          borderRadius: dimension / 2,
          height: dimension,
          justifyContent: 'center',
          opacity: disabled ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1,
          width: dimension,
        })}
        testID={testID}
      >
        <AnimatedView style={[{ position: 'absolute' }, playStyle]}>
          <Icon color={theme.colors.onBrand} mirrorInRtl name={PLAY} size={glyph} testID={`${testID}-play`} />
        </AnimatedView>
        <AnimatedView style={[{ position: 'absolute' }, pauseStyle]}>
          <Icon color={theme.colors.onBrand} name={PAUSE} size={glyph} testID={`${testID}-pause`} />
        </AnimatedView>
      </Pressable>
    </BufferingRing>
  );
}
