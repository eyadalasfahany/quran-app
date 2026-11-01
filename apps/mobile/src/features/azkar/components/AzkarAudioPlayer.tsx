import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { Card, IconButton, ToggleRow, UiText, useContrastColors } from '@/shared/ui';

import { audioAvailability, isPlayableAvailability } from '../audio/availability';
import { formatClock } from '../audio/clock';
import { NoAudioDownloadPort, percentOf, type AzkarDownloadPort } from '../audio/downloads';
import { useAzkarUnitPlayback, useIsDownloaded, useOnline } from '../audio/hooks';
import {
  replayAzkarRecording,
  stopAzkarRecording,
  useAzkarPlaybackStore,
} from '../audio/playback';
import { startAzkarPlayback } from '../audio/start';
import type { AzkarRecording } from '../data/model';
import { AzkarAttributionLine } from './AzkarAttributionLine';

const REPLAY = { ios: 'arrow.counterclockwise', android: 'replay' } as const;

/**
 * The player under the reader's actions (ADR 0031 §8, developer 1 Nov 2026). A thin progress bar with elapsed and total
 * time, replay, the «تشغيل تلقائي» preference and the attribution. It renders nothing unless the recording can play.
 *
 * It stops when its unit leaves the reader (unmount, which the reader keys by unit). With `autoStart` it begins the
 * unit's recording as the reader advances from a finished one, then clears the flag. The reader never counts for the
 * user: `onEnded` only moves the view.
 */
export function AzkarAudioPlayer({
  recording,
  unitKey,
  autoplay,
  onAutoplayChange,
  autoStart,
  onAutoStarted,
  onEnded,
  port = NoAudioDownloadPort,
  testID = 'azkar-audio-player',
}: {
  recording: AzkarRecording | null;
  unitKey: string;
  autoplay: boolean;
  onAutoplayChange: (value: boolean) => void;
  autoStart: boolean;
  onAutoStarted: () => void;
  onEnded: () => void;
  port?: AzkarDownloadPort;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const locale = useLocale();
  const online = useOnline();
  const downloaded = useIsDownloaded(recording, port);
  const playback = useAzkarUnitPlayback(unitKey);

  // The playback module keeps the callback it was given. This ref gives it the reader's latest one.
  const endedRef = useRef(onEnded);
  useEffect(() => {
    endedRef.current = onEnded;
  }, [onEnded]);
  const handleEnded = useCallback(() => {
    endedRef.current();
  }, []);

  const availability = audioAvailability(recording, { online, downloaded });
  const playable = isPlayableAvailability(availability);

  useEffect(() => {
    if (!autoStart) {
      return;
    }
    if (recording !== null && playable) {
      startAzkarPlayback(recording, availability, { unitKey, onEnded: handleEnded });
    }
    onAutoStarted();
  }, [autoStart, recording, playable, availability, unitKey, onAutoStarted, handleEnded]);

  // Leaving the unit (the reader remounts this player per unit) or the reader stops this unit's recording.
  useEffect(
    () => () => {
      if (useAzkarPlaybackStore.getState().unitKey === unitKey) {
        stopAzkarRecording();
      }
    },
    [unitKey],
  );

  if (recording === null || !playable) {
    return null;
  }

  const elapsedMs = playback.active ? playback.positionMs : 0;
  const totalMs = playback.active && playback.durationMs > 0 ? playback.durationMs : recording.durationMs;
  const percent = totalMs > 0 ? percentOf(elapsedMs / totalMs) : 0;
  const elapsedText = formatClock(elapsedMs, locale);
  const totalText = formatClock(totalMs, locale);

  const onReplay = () => {
    if (playback.active && playback.status !== 'idle') {
      replayAzkarRecording();
      return;
    }
    startAzkarPlayback(recording, availability, { unitKey, onEnded: handleEnded });
  };

  return (
    <View style={{ gap: theme.space[3] }} testID={testID}>
      <Card padding={4} radius="lg">
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }}>
          <View style={{ flex: 1, gap: theme.size.progressGap }}>
            <View
              accessible
              accessibilityLabel={t('azkar.audio.position', { elapsed: elapsedText, total: totalText })}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: percent }}
              style={{
                backgroundColor: colors.fillSecondary,
                borderRadius: theme.radius.progress,
                flexDirection: 'row',
                height: theme.size.progressHeight,
                overflow: 'hidden',
              }}
            >
              {/* Row direction is the layout direction: the fill starts at the leading edge (right in Arabic). */}
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <UiText tone="muted" variant="caption" testID={`${testID}-elapsed`}>
                {elapsedText}
              </UiText>
              <UiText tone="muted" variant="caption" testID={`${testID}-total`}>
                {totalText}
              </UiText>
            </View>
          </View>
          <IconButton
            icon={REPLAY}
            label={t('azkar.audio.replay')}
            onPress={onReplay}
            testID={`${testID}-replay`}
            tone="muted"
            variant="plain"
          />
        </View>
        <ToggleRow
          onValueChange={onAutoplayChange}
          separator="line"
          subtitle={t('azkar.audio.autoplayHint')}
          testID={`${testID}-autoplay`}
          title={t('azkar.audio.autoplay')}
          value={autoplay}
        />
      </Card>
      <AzkarAttributionLine recording={recording} />
    </View>
  );
}
