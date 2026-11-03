import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { megabytes } from '@/core/format/megabytes';
import { formatNumber } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { Card, UiText } from '@/shared/ui';

import { StorageSegmentBar } from './StorageSegmentBar';

type Props = {
  audioBytes: number;
  fontBytes: number;
  tafsirBytes: number;
  totalBytes: number;
  loading: boolean;
  testID?: string;
};

export function StorageCard({ audioBytes, fontBytes, tafsirBytes, totalBytes, loading, testID }: Props) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();

  const formatMb = (bytes: number) =>
    t('downloads.megabytes', { value: formatNumber(megabytes(bytes), locale) });

  const totalLabel = loading ? '…' : formatMb(totalBytes);
  const audioLabel = formatMb(audioBytes);
  const fontsLabel = formatMb(fontBytes);
  const tafsirLabel = formatMb(tafsirBytes);

  const accessibilityLabel = `${t('downloads.screen.storage')}: ${totalLabel}. ${t('downloads.screen.legend.audio')}: ${audioLabel}. ${t('downloads.screen.legend.fonts')}: ${fontsLabel}. ${t('downloads.screen.legend.tafsir')}: ${tafsirLabel}.`;

  const legendGap = theme.space[1] + 2;
  const legendItems = [
    { color: theme.colors.brand, label: t('downloads.screen.legend.audio'), size: audioLabel },
    { color: theme.colors.gold, label: t('downloads.screen.legend.fonts'), size: fontsLabel },
    { color: theme.colors.chartBlue, label: t('downloads.screen.legend.tafsir'), size: tafsirLabel },
  ];

  return (
    <Card accessible accessibilityLabel={accessibilityLabel} padding={4} radius="lg" testID={testID}>
      <View style={{ gap: theme.space[2] + 2 }}>
        <View style={{ alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' }}>
          <UiText variant="headline">{t('downloads.screen.storage')}</UiText>
          <UiText tone="muted" variant="caption">
            {totalLabel}
          </UiText>
        </View>
        <StorageSegmentBar audioBytes={audioBytes} fontBytes={fontBytes} tafsirBytes={tafsirBytes} testID={testID ? `${testID}-bar` : undefined} />
        <View
          style={{
            columnGap: theme.space[3],
            flexDirection: 'row',
            flexWrap: 'wrap',
            rowGap: legendGap,
          }}
        >
          {legendItems.map((item) => (
            <View
              key={item.label}
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                gap: legendGap,
                width: '45%',
              }}
            >
              <View
                style={{
                  backgroundColor: item.color,
                  borderRadius: theme.size.storageDotRadius,
                  height: theme.size.storageDotSize,
                  width: theme.size.storageDotSize,
                }}
              />
              <UiText variant="label" weight={400}>
                {`${item.label} · ${item.size}`}
              </UiText>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}
