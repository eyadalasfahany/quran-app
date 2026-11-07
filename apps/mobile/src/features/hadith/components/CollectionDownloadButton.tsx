import { useTranslation } from 'react-i18next';

import { useLocale } from '@/core/i18n/useLocale';
import { formatPercent } from '@/core/i18n';
import { Button, IconButton } from '@/shared/ui';

const CANCEL = { ios: 'xmark', android: 'close' } as const;

export type CollectionDownloadState =
  | { kind: 'installed' }
  | { kind: 'available'; sizeBytes: number; offline: boolean }
  | { kind: 'downloading'; progress: number } // 0 to 1
  | { kind: 'failed' };

/** The trailing control of a collection row: a download pill, a cancel button, or a retry pill. Installed draws nothing. */
export function CollectionDownloadButton({
  state,
  collectionTitle,
  onDownload,
  onCancel,
  onRetry,
  testID = 'collection-download-button',
}: {
  state: CollectionDownloadState;
  collectionTitle: string;
  onDownload: () => void;
  onCancel: () => void;
  onRetry: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();

  if (state.kind === 'installed') {
    return null;
  }

  if (state.kind === 'available') {
    return (
      <Button
        accessibilityLabel={t('hadith.download.startFor', { title: collectionTitle })}
        disabled={state.offline}
        label={t('ui.download.start')}
        onPress={onDownload}
        size="small"
        testID={testID}
        variant="primary"
      />
    );
  }

  if (state.kind === 'downloading') {
    const clamped = Math.min(1, Math.max(0, state.progress));
    const percent = formatPercent(Math.round(clamped * 100), locale);
    return (
      <IconButton
        hint={t('hadith.download.progress', { percent })}
        icon={CANCEL}
        label={t('ui.download.cancel')}
        onPress={onCancel}
        testID={testID}
        variant="raised"
      />
    );
  }

  return (
    <Button label={t('hadith.download.retry')} onPress={onRetry} size="small" testID={testID} variant="primary" />
  );
}
