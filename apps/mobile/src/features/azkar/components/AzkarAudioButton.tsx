import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName, UiText } from '@/shared/ui';

import { audioAvailability } from '../audio/availability';
import { NoAudioDownloadPort, type AzkarDownloadPort } from '../audio/downloads';
import { useAzkarUnitPlayback, useIsDownloaded, useOnline } from '../audio/hooks';
import { pauseAzkarRecording, playAzkarRecording, resumeAzkarRecording } from '../audio/playback';
import type { AzkarRecording } from '../data/model';

const PLAY = { ios: 'play.fill', android: 'play_arrow' } as const satisfies IconName;
const PAUSE = { ios: 'pause.fill', android: 'pause' } as const satisfies IconName;
const OFFLINE = { ios: 'wifi.slash', android: 'wifi_off' } as const satisfies IconName;

/**
 * The reader's play or pause control for the unit's licensed recording (ADR 0031 §8, frame AzkarReaderAudio).
 * - No recording, or no rights: renders nothing. No disabled control is drawn.
 * - Streaming allowed and offline, not downloaded: a pill «غير متاح دون اتصال». It is real state, not a control.
 * - Playable (`stream` or `local`): a play or pause button for this unit.
 */
export function AzkarAudioButton({
  recording,
  unitKey,
  onEnded,
  port = NoAudioDownloadPort,
  testID = 'azkar-audio-button',
}: {
  recording: AzkarRecording | null;
  unitKey: string;
  /** Runs when the recording plays to its end (the reader may advance; see AzkarAudioPlayer). */
  onEnded?: () => void;
  port?: AzkarDownloadPort;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const online = useOnline();
  const downloaded = useIsDownloaded(recording, port);
  const playback = useAzkarUnitPlayback(unitKey);

  if (recording === null) {
    return null;
  }

  const availability = audioAvailability(recording, { online, downloaded });
  if (availability === 'none') {
    return null;
  }

  if (availability === 'stream_offline') {
    return (
      <View
        accessible
        accessibilityHint={t('azkar.audio.unavailableOfflineHint')}
        accessibilityLabel={t('azkar.audio.unavailableOffline')}
        accessibilityRole="text"
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.fillSecondary,
          borderRadius: theme.radius.tile,
          flexDirection: 'row',
          gap: theme.space[2],
          minHeight: theme.space[8],
          paddingHorizontal: theme.space[3],
        }}
        testID={`${testID}-offline`}
      >
        <Icon color={theme.colors.inkMuted} name={OFFLINE} size={theme.size.iconSm} />
        <UiText tone="muted" variant="caption" weight={600}>
          {t('azkar.audio.unavailableOffline')}
        </UiText>
      </View>
    );
  }

  const playing = playback.active && playback.status === 'playing';
  const onPress = () => {
    if (playing) {
      pauseAzkarRecording();
      return;
    }
    // A loaded recording resumes, or replays after it finished. Only a unit with nothing loaded starts one.
    if (playback.active && playback.status !== 'idle') {
      resumeAzkarRecording();
      return;
    }
    playAzkarRecording(recording, availability, { unitKey, onEnded });
  };

  return (
    <Pressable
      accessibilityLabel={playing ? t('azkar.audio.pause') : t('azkar.audio.play')}
      accessibilityRole="button"
      accessibilityState={{ selected: playing }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          backgroundColor: theme.colors.brand,
          borderRadius: theme.radius.pill,
          height: theme.size.touchTarget,
          justifyContent: 'center',
          width: theme.size.touchTarget,
          opacity: pressed ? theme.opacity.pressed : 1,
        },
      ]}
      testID={testID}
    >
      <Icon color={theme.colors.surface} mirrorInRtl={!playing} name={playing ? PAUSE : PLAY} size={theme.size.iconMd} />
    </Pressable>
  );
}
