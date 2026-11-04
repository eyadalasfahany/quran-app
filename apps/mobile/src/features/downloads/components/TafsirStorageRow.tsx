import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { megabytes } from '@/core/format/megabytes';
import { formatNumber } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

type Props = {
  resourceId: number;
  nameAr: string | null;
  packSizeBytes: number;
  showDivider?: boolean;
  testID?: string;
};

export function TafsirStorageRow({ resourceId, nameAr, packSizeBytes, showDivider = false, testID }: Props) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const colors = useContrastColors();
  const title = nameAr ?? String(resourceId);

  return (
    <View
      style={[
        {
          alignItems: 'center',
          flexDirection: 'row',
          gap: theme.space[3],
          minHeight: theme.size.downloadRowMinHeight,
          paddingHorizontal: theme.size.downloadRowInset,
        },
        showDivider ? { borderBottomColor: colors.line, borderBottomWidth: theme.stroke.hairline } : null,
      ]}
      testID={testID}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <UiText variant="headline">{title}</UiText>
        <UiText tone="muted" variant="label" weight={400}>
          {t('downloads.megabytes', { value: formatNumber(megabytes(packSizeBytes), locale) })}
        </UiText>
      </View>
    </View>
  );
}
