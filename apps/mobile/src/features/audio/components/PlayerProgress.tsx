import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui/UiText';

import { fractionAfterDrag, formatClock, playbackFraction, SEEK_STEP_MS, steppedPosition } from '../player-view';

const HIT_HEIGHT = 44;
const TRACK_HEIGHT = 4;

// The track fills from the start edge: the right in Arabic, the left in English. Elapsed time sits at the start,
// the total at the end. Both show once the duration is known and read 0:00 before that.
// A drag or an adjustable step seeks. A seek with no known duration does nothing.
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
  const [dragFraction, setDragFraction] = useState<number | null>(null);
  const canSeek = durationMs > 0;
  const fraction = playbackFraction(positionMs, durationMs);
  const shown = dragFraction ?? fraction;
  const elapsed = formatClock(canSeek ? positionMs : 0, locale);
  const total = formatClock(durationMs, locale);

  // A drag starts at the touch's page x and the fraction it started from. The responder props are read on every
  // render, so each handler sees the current duration and seek callback.
  const drag = useRef<{ startX: number; startFraction: number; current: number } | null>(null);
  const onGrant = (event: GestureResponderEvent) => {
    const startFraction = fraction;
    drag.current = { startX: event.nativeEvent.pageX, startFraction, current: startFraction };
    setDragFraction(startFraction);
  };
  const onMove = (event: GestureResponderEvent) => {
    const current = drag.current;
    if (current === null) {
      return;
    }
    const next = fractionAfterDrag(current.startFraction, event.nativeEvent.pageX - current.startX, width, I18nManager.isRTL);
    current.current = next;
    setDragFraction(next);
  };
  const onEnd = () => {
    const current = drag.current;
    drag.current = null;
    setDragFraction(null);
    if (current !== null && canSeek) {
      onSeek(Math.round(current.current * durationMs));
    }
  };

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
        onResponderGrant={onGrant}
        onResponderMove={onMove}
        onResponderRelease={onEnd}
        onResponderTerminate={onEnd}
        onStartShouldSetResponder={() => canSeek}
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
