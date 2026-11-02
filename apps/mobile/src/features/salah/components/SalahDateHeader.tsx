import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { BackButton, IconButton, UiText } from '@/shared/ui';

const LOCATION_ICON = { ios: 'mappin', android: 'location_on' } as const;

/**
 * The الصلاة tab's header: the Amiri title with the Hijri · Gregorian date line under it
 * and the raised location button at the end (quran-app-screens.html, #Salah).
 * `onBack` adds a back button at the leading edge; the pushed route (/salah) passes it, the tab does not.
 */
export function SalahDateHeader({
  title,
  subtitle,
  onLocationPress,
  onBack,
  testID = 'salah-header',
}: {
  title: string;
  /** «٢٠ جمادى الأولى ١٤٤٨ · السبت ٣١ أكتوبر», precomposed by the screen. */
  subtitle: string;
  onLocationPress: () => void;
  onBack?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }} testID={testID}>
      {onBack ? <BackButton onPress={onBack} testID={`${testID}-back`} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <UiText accessibilityRole="header" variant="displayMd">
          {title}
        </UiText>
        <UiText testID={`${testID}-subtitle`} tone="muted" variant="subhead">
          {subtitle}
        </UiText>
      </View>
      <IconButton
        icon={LOCATION_ICON}
        label={t('salah.location.a11y')}
        onPress={onLocationPress}
        testID={`${testID}-location`}
        variant="raised"
      />
    </View>
  );
}
