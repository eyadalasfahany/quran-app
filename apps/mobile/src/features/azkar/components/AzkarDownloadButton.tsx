import { useReducer } from 'react';
import { useTranslation } from 'react-i18next';

import { formatNumber } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { Button, IconButton, type IconName } from '@/shared/ui';

import { canDownload } from '../audio/availability';
import { NoAudioDownloadPort, percentOf, type AzkarDownloadPort } from '../audio/downloads';
import { useDownloadEntry } from '../audio/hooks';
import type { AzkarRecording } from '../data/model';

const DOWNLOAD = { ios: 'arrow.down.circle', android: 'download' } as const satisfies IconName;
const CANCEL = { ios: 'xmark', android: 'close' } as const satisfies IconName;
const REMOVE = { ios: 'trash', android: 'delete' } as const satisfies IconName;

/**
 * Downloads one recording (ADR 0031 §8). It renders nothing unless downloading is allowed, so no disabled download
 * button is drawn. States: idle (download), downloading (cancel, with the progress as its hint), done (remove) and
 * failed (retry).
 */
export function AzkarDownloadButton({
  recording,
  port = NoAudioDownloadPort,
  testID = 'azkar-download-button',
}: {
  recording: AzkarRecording | null;
  port?: AzkarDownloadPort;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  // The port has no change signal yet, so each action re-reads it.
  const [, refresh] = useReducer((count: number) => count + 1, 0);
  const entry = useDownloadEntry(recording, port);

  if (recording === null || !canDownload(recording)) {
    return null;
  }

  const state = entry?.state ?? 'idle';

  if (state === 'downloading') {
    const percent = formatNumber(percentOf(entry?.progress ?? 0), locale);
    return (
      <IconButton
        hint={t('azkar.download.progress', { percent })}
        icon={CANCEL}
        label={t('azkar.download.cancel')}
        onPress={() => {
          port.cancel(recording.recordingKey);
          refresh();
        }}
        testID={testID}
        tone="muted"
        variant="plain"
      />
    );
  }

  if (state === 'done') {
    return (
      <IconButton
        icon={REMOVE}
        label={t('azkar.download.remove')}
        onPress={() => {
          port.remove(recording.recordingKey);
          refresh();
        }}
        testID={testID}
        tone="muted"
        variant="plain"
      />
    );
  }

  if (state === 'failed') {
    return (
      <Button
        label={t('azkar.download.retry')}
        onPress={() => {
          port.enqueue(recording);
          refresh();
        }}
        size="small"
        testID={testID}
        variant="ghost"
      />
    );
  }

  return (
    <IconButton
      icon={DOWNLOAD}
      label={t('azkar.download.download')}
      onPress={() => {
        port.enqueue(recording);
        refresh();
      }}
      testID={testID}
      tone="muted"
      variant="plain"
    />
  );
}
