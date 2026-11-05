import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { SPEED_RATES } from '@/features/azkar/audio/speed-rates';
import { useSheet } from '@/features/reader/components/sheet-context';
import { SheetScrollView } from '@/features/reader/components/SheetScrollView';
import { IconButton, UiText, type IconName } from '@/shared/ui';

import {
  azkarSleepRemainingMinutes,
  chooseAzkarSleep,
} from '../audio/sleep-timer';
import { pauseAzkarPlayback, resumeAzkarPlayback, seekAzkarPlayback, setAzkarRepeatMode, setAzkarSpeed, skipAzkarPlayback } from '../audio/playback';
import { currentAzkarItem, useAzkarPlayerStore, type AzkarSleepMode } from '../audio/azkarPlayerStore';
import { repetitionOf, type AzkarRepeatMode } from '../audio/queue';
import { AzkarAttributionLine } from './AzkarAttributionLine';
import { AzkarDownloadButton } from './AzkarDownloadButton';
import { AzkarOptionChoices, type AzkarOptionChoice } from './AzkarOptionChoices';
import { AzkarPlayerControl } from './AzkarPlayerControl';
import { AzkarPlayerDhikr } from './AzkarPlayerDhikr';
import { AzkarPlayerHeader } from './AzkarPlayerHeader';
import { AzkarPlayerOptionsBar } from './AzkarPlayerOptionsBar';
import { AzkarPlayerProgress } from './AzkarPlayerProgress';
import { AzkarPlayerRepetition } from './AzkarPlayerRepetition';

const PREVIOUS = { ios: 'backward.end.fill', android: 'skip_previous' } as const satisfies IconName;
const NEXT = { ios: 'forward.end.fill', android: 'skip_next' } as const satisfies IconName;

const REPEAT_LABEL = {
  count: 'azkar.player.repeat.count',
  once: 'azkar.player.repeat.once',
  continuous: 'azkar.player.repeat.continuous',
} as const;

type OpenOption = 'repeat' | 'speed' | 'sleep' | null;

/**
 * The full Azkar player's content, in the sheet (ADR 0031 §8). It reads the Azkar player store and wires the controls to
 * the engine: the dhikr's text, the seek bar, the transport, the repetition, the options (repeat, speed, sleep), the
 * attribution and the download. It draws nothing for a scope that is not playing.
 */
export function AzkarPlayerBody({ testID = 'azkar-player-body' }: { testID?: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const sheet = useSheet();
  const scope = useAzkarPlayerStore((state) => state.scope);
  const queue = useAzkarPlayerStore((state) => state.queue);
  const index = useAzkarPlayerStore((state) => state.index);
  const status = useAzkarPlayerStore((state) => state.status);
  const error = useAzkarPlayerStore((state) => state.error);
  const positionMs = useAzkarPlayerStore((state) => state.positionMs);
  const durationMs = useAzkarPlayerStore((state) => state.durationMs);
  const repeatMode = useAzkarPlayerStore((state) => state.repeatMode);
  const speed = useAzkarPlayerStore((state) => state.speed);
  const playsDone = useAzkarPlayerStore((state) => state.playsDone);
  const countAtStart = useAzkarPlayerStore((state) => state.countAtStart);
  const sleepMode = useAzkarPlayerStore((state) => state.sleepMode);
  const sleepEndsAtMs = useAzkarPlayerStore((state) => state.sleepEndsAtMs);
  const sleepNowMs = useAzkarPlayerStore((state) => state.sleepNowMs);
  const [open, setOpen] = useState<OpenOption>(null);

  const item = currentAzkarItem({ queue, index });
  if (scope === null || item === null) {
    return null;
  }

  const playing = status === 'playing';
  const repetition = repetitionOf(item.requiredCount, countAtStart, playsDone);
  const remainingMinutes = azkarSleepRemainingMinutes(sleepEndsAtMs, sleepNowMs) ?? 0;
  const sleepLabel =
    sleepMode === 'off'
      ? t('player.options.sleep')
      : sleepMode === 'endOfUnit'
        ? t('azkar.player.sleep.endOfUnit')
        : t('player.sleep.remaining', { minutes: formatNumber(remainingMinutes, locale) });
  const speedLabel = t('player.options.speed', { rate: formatNumber(speed, locale) });

  const repeatChoices: AzkarOptionChoice[] = (Object.keys(REPEAT_LABEL) as AzkarRepeatMode[]).map((mode) => ({
    value: mode,
    label: t(REPEAT_LABEL[mode]),
  }));
  const speedChoices: AzkarOptionChoice[] = SPEED_RATES.map((rate) => ({
    value: String(rate),
    label: t('player.options.rateValue', { rate: formatNumber(rate, locale) }),
  }));
  const sleepChoices: AzkarOptionChoice[] = [
    { value: 'off', label: t('player.sleep.off') },
    { value: 'minutes15', label: t('player.sleep.minutes', { minutes: formatNumber(15, locale) }) },
    { value: 'minutes30', label: t('player.sleep.minutes', { minutes: formatNumber(30, locale) }) },
    { value: 'minutes60', label: t('player.sleep.minutes', { minutes: formatNumber(60, locale) }) },
    { value: 'endOfUnit', label: t('azkar.player.sleep.endOfUnit') },
  ];

  const toggle = (option: Exclude<OpenOption, null>) => setOpen((current) => (current === option ? null : option));

  return (
    <SheetScrollView contentContainerStyle={{ padding: theme.space[4] }} testID={testID}>
      <View style={{ gap: theme.space[5] }}>
        <AzkarPlayerHeader caption={t('player.nowPlaying')} onMinimize={() => sheet?.close()} />
        <View style={{ alignItems: 'center', gap: theme.space[1] }}>
          <UiText accessibilityRole="header" align="center" variant="title">
            {scope.title}
          </UiText>
          <UiText align="center" tone="muted" variant="caption">
            {t('azkar.player.queuePosition', { current: formatNumber(index + 1, locale), total: formatNumber(queue.length, locale) })}
          </UiText>
        </View>
        <AzkarPlayerDhikr unit={item.unit} />
        <AzkarPlayerProgress
          durationMs={durationMs}
          onSeek={seekAzkarPlayback}
          positionMs={positionMs}
          testID={`${testID}-progress`}
        />
        {repetition === null ? null : <AzkarPlayerRepetition current={repetition.current} testID={`${testID}-repetition`} total={repetition.total} />}
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[6], justifyContent: 'center' }}>
          <IconButton
            icon={PREVIOUS}
            label={t('azkar.player.previous')}
            mirrorInRtl
            onPress={() => skipAzkarPlayback(-1)}
            testID={`${testID}-previous`}
            tone="ink"
            variant="plain"
          />
          <AzkarPlayerControl
            onPress={() => {
              if (playing || status === 'loading') {
                pauseAzkarPlayback();
                return;
              }
              resumeAzkarPlayback();
            }}
            playing={playing}
            size="sheet"
            testID={`${testID}-toggle`}
          />
          <IconButton
            disabled={index >= queue.length - 1}
            icon={NEXT}
            label={t('azkar.player.next')}
            mirrorInRtl
            onPress={() => skipAzkarPlayback(1)}
            testID={`${testID}-next`}
            tone="ink"
            variant="plain"
          />
        </View>
        {status === 'error' ? (
          <UiText align="center" testID={`${testID}-error`} tone="danger" variant="caption">
            {error === 'offline' ? t('azkar.audio.unavailableOffline') : t('player.errors.loadFailed')}
          </UiText>
        ) : null}
        {status === 'finished' ? (
          <UiText align="center" testID={`${testID}-finished`} tone="muted" variant="caption">
            {t('azkar.player.finished')}
          </UiText>
        ) : null}
        <AzkarPlayerOptionsBar
          onRepeat={() => toggle('repeat')}
          onSleep={() => toggle('sleep')}
          onSpeed={() => toggle('speed')}
          repeatLabel={t(REPEAT_LABEL[repeatMode])}
          repeatOpen={open === 'repeat'}
          sleepArmed={sleepMode !== 'off'}
          sleepLabel={sleepLabel}
          sleepOpen={open === 'sleep'}
          speedLabel={speedLabel}
          speedOpen={open === 'speed'}
        />
        {open === 'repeat' ? (
          <AzkarOptionChoices
            choices={repeatChoices}
            onSelect={(value) => {
              setAzkarRepeatMode(value as AzkarRepeatMode);
              setOpen(null);
            }}
            selected={repeatMode}
            testID={`${testID}-repeat-choices`}
            title={t('azkar.player.repeat.option')}
          />
        ) : null}
        {open === 'speed' ? (
          <AzkarOptionChoices
            choices={speedChoices}
            onSelect={(value) => {
              setAzkarSpeed(Number(value));
              setOpen(null);
            }}
            selected={String(speed)}
            testID={`${testID}-speed-choices`}
            title={t('player.options.speedTitle')}
          />
        ) : null}
        {open === 'sleep' ? (
          <AzkarOptionChoices
            choices={sleepChoices}
            onSelect={(value) => {
              chooseAzkarSleep(value as AzkarSleepMode);
              setOpen(null);
            }}
            selected={sleepMode}
            testID={`${testID}-sleep-choices`}
            title={t('player.options.sleep')}
          />
        ) : null}
        <View style={{ alignItems: 'center', gap: theme.space[2] }}>
          <AzkarAttributionLine recording={item.recording} testID={`${testID}-attribution`} />
          <AzkarDownloadButton recording={item.recording} />
        </View>
      </View>
    </SheetScrollView>
  );
}
