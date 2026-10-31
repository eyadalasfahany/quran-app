import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button } from '@/shared/ui/Button';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { UiText } from '@/shared/ui/UiText';

const NO_LOCATION_ICON: IconName = { ios: 'location.slash', android: 'location_off' };

/**
 * Location unset (neither GPS nor a manual city): the dial cannot be computed, so the
 * screen shows this instead. Player-dark canvas, so the shared (light) EmptyState does
 * not apply; same composition, qibla tokens.
 */
export function QiblaNoLocation({ onSetLocation, testID }: { onSetLocation: () => void; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: theme.space[3], paddingHorizontal: theme.space[8] }} testID={testID}>
      <Icon color={theme.colors.playerAccent} name={NO_LOCATION_ICON} size={48} />
      <UiText accessibilityRole="header" align="center" style={{ color: theme.colors.playerInk }} variant="title">
        {t('home.salah.qiblaScreen.noLocationTitle')}
      </UiText>
      <UiText align="center" style={{ color: theme.colors.playerMuted }} variant="subhead">
        {t('home.salah.qiblaScreen.noLocationBody')}
      </UiText>
      <Button
        label={t('home.salah.qiblaScreen.setLocation')}
        onPress={onSetLocation}
        style={{ alignSelf: 'center', marginTop: theme.space[1] }}
        testID={testID ? `${testID}-action` : undefined}
        variant="primary"
      />
    </View>
  );
}
