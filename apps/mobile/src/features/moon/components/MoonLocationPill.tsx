import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName, UiText } from '@/shared/ui';

export const MOON_LOCATION_ICON: IconName = { ios: 'mappin', android: 'place' };

/**
 * The Salah location, shown in the sighting header (#MoonSighting). It is read-only here: tapping it opens Salah,
 * where the location is set.
 */
export function MoonLocationPill({
  label,
  onPress,
  testID = 'moon-location-pill',
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={t('moon.locationA11y', { label })}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: pressed ? theme.colors.fillSecondary : theme.colors.surfaceRaised,
        borderColor: theme.colors.line,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        flexDirection: 'row',
        gap: theme.space[1],
        minHeight: theme.size.touchTarget,
        paddingHorizontal: theme.space[3],
      })}
      testID={testID}
    >
      <Icon color={theme.colors.brand} name={MOON_LOCATION_ICON} size={18} testID={`${testID}-icon`} />
      <UiText variant="subhead">{label}</UiText>
    </Pressable>
  );
}
