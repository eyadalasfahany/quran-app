import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { Card, UiText } from '@/shared/ui';

import { megabytes } from '../audio/downloads';

/** The storage used by downloaded recordings, in megabytes (one decimal). Shown on the downloads screen. */
export function AzkarStorageSummary({ bytes, testID = 'azkar-storage-summary' }: { bytes: number; testID?: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const value = t('azkar.downloads.megabytes', { value: formatNumber(megabytes(bytes), locale) });

  return (
    <Card padding={4} radius="lg" testID={testID}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: theme.size.controlHeight }}>
        <UiText variant="body">{t('azkar.downloads.storage')}</UiText>
        <UiText tone="muted" variant="subhead" weight={600} testID={`${testID}-value`}>
          {value}
        </UiText>
      </View>
    </Card>
  );
}
