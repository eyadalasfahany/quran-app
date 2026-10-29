import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { DownloadRow, type DownloadRowState, UiText, useContrastColors } from '@/shared/ui';

export type TafsirDownloadItem = {
  resourceId: number;
  title: string;
  subtitle?: string;
  state: DownloadRowState;
  /** 0 to 1. Only drawn while downloading. */
  progress: number;
};

// The list shown when no tafsir is readable yet: an intro line and one card of download rows.
export function TafsirDownloadList({
  items,
  onDownload,
  onCancel,
  onOpen,
  showIntro = true,
  testID = 'tafsir-download-list',
}: {
  items: TafsirDownloadItem[];
  onDownload: (resourceId: number) => void;
  onCancel: (resourceId: number) => void;
  onOpen: (resourceId: number) => void;
  /** The intro line above the card. The reader's single-tafsir card leaves it out. */
  showIntro?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const actionLabels = {
    download: t('ui.download.start'),
    cancel: t('ui.download.cancel'),
    open: t('ui.download.open'),
  };

  return (
    <View style={{ gap: theme.size.sheetGap }} testID={testID}>
      {showIntro ? (
        <UiText
          style={{ lineHeight: theme.size.creditLineHeight, paddingHorizontal: theme.size.frameInset }}
          tone="muted"
          variant="label"
          weight={400}
        >
          {t('reader.tafsir.downloadIntro')}
        </UiText>
      ) : null}
      <View
        style={{
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: colors.line,
          borderRadius: theme.radius.lg,
          borderWidth: theme.stroke.hairline,
          overflow: 'hidden',
        }}
        testID={`${testID}-card`}
      >
        {items.map((item, index) => (
          <DownloadRow
            actionLabels={actionLabels}
            key={item.resourceId}
            onCancel={() => {
              onCancel(item.resourceId);
            }}
            onDownload={() => {
              onDownload(item.resourceId);
            }}
            onOpen={() => {
              onOpen(item.resourceId);
            }}
            progress={item.progress}
            showDivider={index < items.length - 1}
            state={item.state}
            subtitle={item.subtitle}
            testID={`${testID}-row-${item.resourceId}`}
            title={item.title}
          />
        ))}
      </View>
    </View>
  );
}
