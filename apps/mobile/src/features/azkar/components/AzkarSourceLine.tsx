import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { Icon, UiText } from '@/shared/ui';

import { referenceNumber } from '../screens/reader-model';

const INFO = { ios: 'info.circle', android: 'info' } as const;

/** «حصن المسلم · ٧٥» and the button that opens the source and details. */
export function AzkarSourceLine({
  reference,
  onPressDetails,
  testID = 'azkar-source-line',
}: {
  reference: string;
  onPressDetails: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();

  return (
    <View style={{ alignItems: 'center', gap: theme.space[2] }} testID={testID}>
      <UiText align="center" tone="muted" variant="caption">
        {t('azkar.reader.source', { number: referenceNumber(reference, locale) })}
      </UiText>
      <Pressable
        accessibilityLabel={t('azkar.reader.details')}
        accessibilityRole="button"
        hitSlop={theme.space[2]}
        onPress={onPressDetails}
        style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2], minHeight: theme.size.touchTarget }}
        testID="azkar-source-details"
      >
        <UiText tone="brand" variant="subhead" weight={600}>
          {t('azkar.reader.details')}
        </UiText>
        <Icon color={theme.colors.brand} name={INFO} size={18} />
      </Pressable>
    </View>
  );
}
