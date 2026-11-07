import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { Button, CollectionCover, Divider, SheetHeader, ToggleRow, UiText } from '@/shared/ui';

import { formatPackSizeMb } from '../format';

import type { CollectionDownloadState } from './CollectionDownloadButton';
import { HadithDownloadProgress } from './HadithDownloadProgress';

// Frame HadithCollDownload: the title is Amiri 19 over 33 (Amiri's natural leading). UiText scales the line height with the font.
const TITLE_SIZE = 19;
const TITLE_LINE_HEIGHT = 33;

/** The download sheet body: the cover and title, the size and Wi-Fi rows, the state's action and the offline note. */
export function HadithDownloadSheet({
  title,
  slug,
  coverTitle,
  sizeBytes,
  state,
  wifiOnly,
  onWifiOnlyChange,
  waitingForWifi,
  onDownload,
  onCancel,
  onRetry,
  onClose,
  testID = 'hadith-download-sheet',
}: {
  title: string;
  slug: string | null;
  coverTitle: string | null;
  sizeBytes: number;
  state: CollectionDownloadState;
  wifiOnly: boolean;
  onWifiOnlyChange: (on: boolean) => void;
  waitingForWifi: boolean;
  onDownload: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onClose: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();

  let action: ReactElement | null = null;
  if (state.kind === 'available') {
    // Not drawn in the frame (Open question 5): the start button, disabled while offline.
    action = (
      <Button
        disabled={state.offline}
        label={t('ui.download.start')}
        onPress={onDownload}
        stretch
        testID={`${testID}-start`}
        variant="primary"
      />
    );
  } else if (state.kind === 'downloading') {
    action = <HadithDownloadProgress onCancel={onCancel} percent={state.progress} testID={`${testID}-progress`} />;
  } else if (state.kind === 'waiting') {
    action = <Button label={t('hadith.download.cancel')} onPress={onCancel} stretch testID={`${testID}-cancel`} variant="secondary" />;
  } else if (state.kind === 'failed') {
    action = (
      <View style={{ gap: theme.space[3] }}>
        <UiText tone="danger" variant="label" weight={400}>
          {t('ui.download.failed')}
        </UiText>
        <Button label={t('hadith.download.retry')} onPress={onRetry} stretch testID={`${testID}-retry`} variant="primary" />
      </View>
    );
  }

  return (
    <View style={{ gap: theme.space[4] }} testID={testID}>
      <SheetHeader closeLabel={t('hadith.download.close')} onClose={onClose} testID={`${testID}-header`} title={t('hadith.download.sheetTitle')} />
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }}>
        <CollectionCover size="compact" slug={slug} testID={`${testID}-cover`} title={coverTitle} />
        <UiText
          style={{ flex: 1, fontSize: TITLE_SIZE, lineHeight: TITLE_LINE_HEIGHT, minWidth: 0 }}
          testID={`${testID}-title`}
          variant="displaySm"
        >
          {title}
        </UiText>
      </View>
      <View style={{ backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radius.lg, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: theme.space[4] }}>
          <UiText variant="body">{t('hadith.download.size')}</UiText>
          <UiText testID={`${testID}-size`} tone="muted" variant="body">
            {t('ui.download.size', { size: formatPackSizeMb(sizeBytes, locale) })}
          </UiText>
        </View>
        <Divider />
        <ToggleRow onValueChange={onWifiOnlyChange} testID={`${testID}-wifi`} title={t('hadith.download.wifiOnly')} value={wifiOnly} />
      </View>
      {waitingForWifi ? (
        <UiText testID={`${testID}-wait-wifi`} tone="muted" variant="caption">
          {t('hadith.download.waitWifi')}
        </UiText>
      ) : null}
      {action}
      <UiText testID={`${testID}-offline-note`} tone="muted" variant="caption">
        {t('hadith.download.offlineNote')}
      </UiText>
    </View>
  );
}
