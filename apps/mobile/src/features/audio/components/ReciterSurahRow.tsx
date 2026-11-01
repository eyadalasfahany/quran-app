import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { formatNumber, useLocale, type Locale } from '@/core/i18n';
import { DownloadRow } from '@/shared/ui/DownloadRow';

import type { DownloadStatus } from '../data/downloads';
import { surahRowModel, type SurahSubtitle } from '../surah-downloads';

const BYTES_PER_MB = 1024 * 1024;

type Translate = TFunction;

// The subtitle's text. The size is in MB with one decimal, as the Downloads frame draws it (٤٫٨ م.ب).
function subtitleText(subtitle: SurahSubtitle, t: Translate, locale: Locale): string | undefined {
  if (subtitle === null) {
    return undefined;
  }
  switch (subtitle.kind) {
    case 'queued':
      return t('listen.download.queued');
    case 'waitingWifi':
      return t('listen.download.waitingWifi');
    case 'paused':
      return t('listen.download.paused');
    case 'downloading':
      return t('ui.download.downloading');
    case 'failed':
      return t('ui.download.failed');
    case 'size': {
      const megabytes = Math.round((subtitle.bytes / BYTES_PER_MB) * 10) / 10;
      return t('ui.download.size', { size: formatNumber(megabytes, locale) });
    }
    case 'offline':
      return t('listen.download.offline');
    case 'verify':
      return t('network.verifyDownloads');
  }
}

// One surah in the reciter's page: a DownloadRow whose state and subtitle come from the surah's download row.
// Each action is passed in; the screen decides what it does.
export function ReciterSurahRow({
  title,
  status,
  progress,
  sizeBytes,
  offline = false,
  verifyNeeded = false,
  onDownload,
  onCancel,
  onPlay,
  onDelete,
  showDivider = false,
  testID,
}: {
  title: string;
  /** The surah's download row, or undefined when it has none. */
  status: DownloadStatus | undefined;
  /** 0 to 1, live while it downloads. */
  progress: number;
  sizeBytes: number | null;
  /** The device is offline: a surah that is not downloaded says so. */
  offline?: boolean;
  /** A finished download that needs a connection to verify. */
  verifyNeeded?: boolean;
  onDownload: () => void;
  onCancel: () => void;
  onPlay: () => void;
  onDelete: () => void;
  showDivider?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const model = surahRowModel(status, sizeBytes, { offline, verifyNeeded });

  return (
    <DownloadRow
      actionLabels={{
        cancel: t('ui.download.cancel'),
        delete: t('listen.download.delete'),
        download: t('ui.download.start'),
        open: t('listen.download.play'),
      }}
      onCancel={onCancel}
      onDelete={onDelete}
      onDownload={onDownload}
      onOpen={onPlay}
      progress={progress}
      showDivider={showDivider}
      state={model.state}
      subtitle={subtitleText(model.subtitle, t, locale)}
      testID={testID}
      title={title}
    />
  );
}
