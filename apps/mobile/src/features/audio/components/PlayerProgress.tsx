import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type LayoutChangeEvent } from 'react-native';

import { formatPlaybackClock } from '@/core/i18n/clock';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui/UiText';

import { SEEK_STEP_MS, steppedPosition } from '../player-view';
import { useSeekDrag } from '../hooks/useSeekDrag';

const HIT_HEIGHT = 44;
const TRACK_HEIGHT = 4;

// The track fills from the start edge: the right in Arabic, the left in English. Elapsed time sits at the start,
// the total at the end. Both show once the duration is known and read 0:00 before that.
// A drag or an adjustable step seeks; the seek is sent on release. A seek with no known duration does nothing.
export function PlayerProgress({
  positionMs,
  durationMs,
  onSeek,
}: {
  positionMs: number;
  durationMs: number;
  onSeek: (positionMs: number) => void;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const canSeek = durationMs > 0;
  const drag = useSeekDrag({ width, positionMs, durationMs, canSeek, onSeek });
  const shown = drag.shownFraction;
  const elapsed = formatPlaybackClock(canSeek ? drag.shownPositionMs : 0, locale);
  const total = formatPlaybackClock(durationMs, locale);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View style={{ alignSelf: 'stretch', gap: 6 }}>
      <View
        accessible
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        accessibilityLabel={t('player.progress')}
        accessibilityRole="adjustable"
        accessibilityState={{ disabled: !canSeek }}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(shown * 100), text: elapsed }}
        onAccessibilityAction={(event) => {
          if (!canSeek) {
            return;
          }
          const step = event.nativeEvent.actionName === 'increment' ? SEEK_STEP_MS : -SEEK_STEP_MS;
          onSeek(steppedPosition(positionMs, step, durationMs));
        }}
        onLayout={onLayout}
        style={{ height: HIT_HEIGHT, justifyContent: 'center' }}
        testID="player-progress"
        {...drag.responder}
      >
        <View
          testID="player-progress-track"
          style={{
            backgroundColor: theme.colors.playerLine,
            borderRadius: theme.radius.progress,
            flexDirection: 'row',
            height: TRACK_HEIGHT,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.goldOnBrandSurface,
              height: TRACK_HEIGHT,
              width: `${Math.round(shown * 100)}%`,
            }}
            testID="player-progress-fill"
          />
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <UiText style={{ color: theme.colors.playerMuted }} testID="player-elapsed" variant="label" weight={400}>
          {elapsed}
        </UiText>
        <UiText style={{ color: theme.colors.playerMuted }} testID="player-total" variant="label" weight={400}>
          {total}
        </UiText>
      </View>
    </View>
  );
}
