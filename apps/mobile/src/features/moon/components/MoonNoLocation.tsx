import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { EmptyState, type IconName } from '@/shared/ui';

export const MOON_NO_LOCATION_ICON: IconName = { ios: 'location.slash', android: 'location_off' };

export function MoonNoLocation({ onOpenSalah, testID = 'moon-no-location' }: { onOpenSalah: () => void; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: theme.space[4] }} testID={testID}>
      <EmptyState
        action={{ label: t('moon.noLocation.action'), onPress: onOpenSalah }}
        body={t('moon.noLocation.body')}
        icon={MOON_NO_LOCATION_ICON}
        testID={`${testID}-empty`}
        title={t('moon.noLocation.title')}
      />
    </View>
  );
}
