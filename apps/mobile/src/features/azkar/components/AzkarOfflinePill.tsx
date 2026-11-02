import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName, UiText } from '@/shared/ui';

const OFFLINE = { ios: 'wifi.slash', android: 'wifi_off' } as const satisfies IconName;

/**
 * The state of a recording that needs the network while the device is offline and it is not downloaded (ADR 0031 §8).
 * It is real state, not a control: no play button is drawn beside it.
 */
export function AzkarOfflinePill({ testID = 'azkar-offline-pill' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityHint={t('azkar.audio.unavailableOfflineHint')}
      accessibilityLabel={t('azkar.audio.unavailableOffline')}
      accessibilityRole="text"
      style={{
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: theme.colors.fillSecondary,
        borderRadius: theme.radius.tile,
        flexDirection: 'row',
        gap: theme.space[2],
        minHeight: theme.space[8],
        paddingHorizontal: theme.space[3],
      }}
      testID={testID}
    >
      <Icon color={theme.colors.inkMuted} name={OFFLINE} size={theme.size.iconSm} />
      <UiText tone="muted" variant="caption" weight={600}>
        {t('azkar.audio.unavailableOffline')}
      </UiText>
    </View>
  );
}
