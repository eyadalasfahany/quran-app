import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type LayoutChangeEvent } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { useSeekDrag } from '@/features/audio/hooks/useSeekDrag';
import { SEEK_STEP_MS, steppedPosition } from '@/features/audio/player-view';
import { UiText } from '@/shared/ui';

import { formatClock } from '../audio/clock';
import { percentOf } from '../audio/downloads';

const SEEK_HIT_HEIGHT = 44;

/**
 * The seek bar of the Azkar player (ADR 0031 §8, ADR 0047). It fills from the reading start edge (the right in Arabic),
 * shows the elapsed time at the start and the time remaining at the end. With `onSeek` it is an adjustable control: a
 * tap seeks to the tapped point, a drag follows the finger and seeks on release (the same drag as the Mushaf player's
 * bar), and VoiceOver or TalkBack step it by 10 seconds. Without it, it only reports the position (the reader's bar).
 */
export function AzkarPlayerProgress({
  positionMs,
  durationMs,
  onSeek,
  testID = 'azkar-player-progress',
}: {
  positionMs: number;
  durationMs: number;
  onSeek?: (positionMs: number) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  // A seek control is adjustable whenever it can seek at all; with no known duration it is disabled, not removed.
  const interactive = onSeek !== undefined;
  const canSeek = interactive && durationMs > 0;
  const drag = useSeekDrag({
    width,
    positionMs,
    durationMs,
    canSeek,
    onSeek: onSeek ?? (() => undefined),
    tapSeeks: true,
  });
  const percent = percentOf(drag.shownFraction);
  const elapsedText = formatClock(drag.shownPositionMs, locale);
  const remainingText = t('azkar.player.remaining', {
    time: formatClock(Math.max(0, durationMs - drag.shownPositionMs), locale),
  });
  const positionLabel = t('azkar.audio.position', { elapsed: elapsedText, total: formatClock(durationMs, locale) });

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const track = (
    <View
      onLayout={onLayout}
      style={{
        backgroundColor: theme.colors.fillSecondary,
        borderRadius: theme.radius.progress,
        flexDirection: 'row',
        height: theme.size.progressHeight,
        overflow: 'hidden',
      }}
      testID={`${testID}-track`}
    >
      {/* Row direction is the layout direction: the fill starts at the leading edge. */}
      <View
        style={{
          backgroundColor: theme.colors.brand,
          borderRadius: theme.radius.progress,
          height: theme.size.progressHeight,
          width: `${percent}%`,
        }}
        testID={`${testID}-fill`}
      />
    </View>
  );

  return (
    <View style={{ alignSelf: 'stretch', gap: theme.space[1] }} testID={testID}>
      {interactive ? (
        <View
          accessible
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          accessibilityHint={t('azkar.player.seekHint')}
          accessibilityLabel={t('azkar.player.seek')}
          accessibilityRole="adjustable"
          accessibilityState={{ disabled: !canSeek }}
          accessibilityValue={{ min: 0, max: 100, now: percent, text: positionLabel }}
          onAccessibilityAction={(event) => {
            if (onSeek === undefined || !canSeek) {
              return;
            }
            const step = event.nativeEvent.actionName === 'increment' ? SEEK_STEP_MS : -SEEK_STEP_MS;
            onSeek(steppedPosition(positionMs, step, durationMs));
          }}
          style={{ justifyContent: 'center', minHeight: SEEK_HIT_HEIGHT }}
          testID={`${testID}-seek`}
          {...drag.responder}
        >
          {track}
        </View>
      ) : (
        <View
          accessible
          accessibilityLabel={positionLabel}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: percent }}
          testID={`${testID}-readout`}
        >
          {track}
        </View>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <UiText tone="muted" variant="caption" testID={`${testID}-elapsed`}>
          {elapsedText}
        </UiText>
        <UiText tone="muted" variant="caption" testID={`${testID}-remaining`}>
          {remainingText}
        </UiText>
      </View>
    </View>
  );
}
