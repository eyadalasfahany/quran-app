import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { BackButton, IconButton, UiText } from '@/shared/ui';

const LOCATION_ICON = { ios: 'mappin', android: 'location_on' } as const;
const SOUND_ICON = { ios: 'speaker.wave.2', android: 'volume_up' } as const;

/**
 * The الصلاة tab's header: the Amiri title with the Hijri · Gregorian date line under it, and the raised buttons at the
 * end: the adhan sound (when `onSoundPress` is given, ADR 0047) next to the location button (quran-app-screens.html,
 * #Salah — canonical layout, ADR 0057). The speaker comes first, so in Arabic it sits between the title and the location.
 * `onBack` adds a back button at the leading edge; the pushed route (/salah) passes it, the tab does not.
 */
export function SalahDateHeader({
  title,
  subtitle,
  onLocationPress,
  onBack,
  onSoundPress,
  testID = 'salah-header',
}: {
  title: string;
  /** «٢٠ جمادى الأولى ١٤٤٨ · السبت ٣١ أكتوبر», precomposed by the screen. */
  subtitle: string;
  onLocationPress: () => void;
  onBack?: () => void;
  /** Opens the adhan sound picker. Without it the header shows the location button alone. */
  onSoundPress?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  const location = (
    <IconButton
      icon={LOCATION_ICON}
      label={t('salah.location.a11y')}
      onPress={onLocationPress}
      testID={`${testID}-location`}
      variant="raised"
    />
  );

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
      {onSoundPress ? (
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }}>
          <IconButton
            icon={SOUND_ICON}
            label={t('salah.adhanSound.a11y')}
            onPress={onSoundPress}
            testID={`${testID}-sound`}
            variant="raised"
          />
          {location}
        </View>
      ) : (
        location
      )}
    </View>
  );
}
