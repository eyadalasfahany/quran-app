import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

import { ReciterStorageRow } from './ReciterStorageRow';

export type ReciterStorageItem = {
  reciterResourceId: number;
  name: string;
  surahCount: number;
  bytes: number;
  isDownloading: boolean;
  downloadProgress: number;
};

/**
 * «التلاوات» section on `#Downloads`: grouped reciter rows with download-all / stop.
 */
export function RecitersStorageSection({
  rows,
  onDownloadAll,
  onStop,
  testID = 'downloads-reciters-section',
}: {
  rows: ReciterStorageItem[];
  onDownloadAll: (reciterResourceId: number) => void;
  onStop: (reciterResourceId: number) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const sectionInset = theme.space[1] + 2;

  if (rows.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: sectionInset }} testID={testID}>
      <UiText
        accessibilityRole="header"
        style={{ marginHorizontal: sectionInset }}
        tone="muted"
        variant="caption"
        weight={600}
      >
        {t('downloads.screen.reciters')}
      </UiText>
      <View
        style={{
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: colors.line,
          borderRadius: theme.radius.lg,
          borderWidth: theme.stroke.hairline,
          overflow: 'hidden',
        }}
      >
        {rows.map((row, index) => (
          <ReciterStorageRow
            bytes={row.bytes}
            downloadProgress={row.downloadProgress}
            isDownloading={row.isDownloading}
            key={row.reciterResourceId}
            name={row.name}
            onDownloadAll={() => onDownloadAll(row.reciterResourceId)}
            onStop={() => onStop(row.reciterResourceId)}
            showDivider={index < rows.length - 1}
            surahCount={row.surahCount}
            testID={`reciter-storage-row-${row.reciterResourceId}`}
          />
        ))}
      </View>
    </View>
  );
}
