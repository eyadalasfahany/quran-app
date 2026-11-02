import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, type IconName } from '@/shared/ui';

import { AzkarPlayerControl } from './AzkarPlayerControl';
import { AzkarPlayerProgress } from './AzkarPlayerProgress';
import { AzkarPlayerRepetition } from './AzkarPlayerRepetition';

const PREVIOUS = { ios: 'backward.end.fill', android: 'skip_previous' } as const satisfies IconName;
const NEXT = { ios: 'forward.end.fill', android: 'skip_next' } as const satisfies IconName;

/**
 * The reader's compact player (ADR 0031 §8, frame AzkarReaderAudio). It sits above the reader's bottom controls, so it
 * never covers the dhikr text. From the start: play or pause, the progress with the elapsed time, the repetition, and
 * the previous and next dhikr. Tapping the middle opens the full player. It draws nothing of its own state beyond the
 * props; the reader passes the playback state in.
 */
export function AzkarPlayerBar({
  playing,
  positionMs,
  durationMs,
  repetition,
  canPrevious,
  canNext,
  onToggle,
  onPrevious,
  onNext,
  onOpen,
  testID = 'azkar-player-bar',
}: {
  playing: boolean;
  positionMs: number;
  durationMs: number;
  /** «٢ من ٣», or null when the dhikr has no sourced count. */
  repetition: { current: number; total: number } | null;
  canPrevious: boolean;
  canNext: boolean;
  onToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onOpen: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.line,
        borderRadius: theme.radius.lg,
        borderWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[1],
        paddingHorizontal: theme.space[2],
        paddingVertical: theme.space[2],
      }}
      testID={testID}
    >
      <AzkarPlayerControl onPress={onToggle} playing={playing} testID={`${testID}-toggle`} />
      <Pressable
        accessibilityHint={t('azkar.player.openHint')}
        accessibilityLabel={t('azkar.player.open')}
        accessibilityRole="button"
        onPress={onOpen}
        style={{ flex: 1, gap: theme.space[1], justifyContent: 'center', minHeight: theme.size.touchTarget, paddingHorizontal: theme.space[1] }}
        testID={`${testID}-open`}
      >
        {repetition === null ? null : (
          <AzkarPlayerRepetition current={repetition.current} testID={`${testID}-repetition`} total={repetition.total} />
        )}
        <AzkarPlayerProgress durationMs={durationMs} positionMs={positionMs} testID={`${testID}-progress`} />
      </Pressable>
      <IconButton
        disabled={!canPrevious}
        icon={PREVIOUS}
        label={t('azkar.player.previous')}
        mirrorInRtl
        onPress={onPrevious}
        testID={`${testID}-previous`}
        tone="muted"
        variant="plain"
      />
      <IconButton
        disabled={!canNext}
        icon={NEXT}
        label={t('azkar.player.next')}
        mirrorInRtl
        onPress={onNext}
        testID={`${testID}-next`}
        tone="muted"
        variant="plain"
      />
    </View>
  );
}
