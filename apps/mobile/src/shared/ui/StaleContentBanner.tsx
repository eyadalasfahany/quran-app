import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { Icon, type IconName } from './Icon';
import { UiText } from './UiText';

const SYNC_ICON = { ios: 'arrow.triangle.2.circlepath', android: 'sync' } as const satisfies IconName;

/**
 * The quiet note that the content has not been checked for over seven days (spec §7, hop 3, item 6). It sits in
 * the surface, not on glass, and is drawn only while `visible`. It asks for a connection and blocks nothing.
 */
export function StaleContentBanner({ visible, testID = 'stale-content-banner' }: { visible: boolean; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (!visible) {
    return null;
  }

  const message = t('network.staleContent');

  return (
    <View
      accessibilityLabel={message}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessible
      style={{
        alignItems: 'center',
        alignSelf: 'stretch',
        backgroundColor: theme.colors.fillSecondary,
        borderRadius: theme.radius.tile,
        flexDirection: 'row',
        gap: theme.space[2],
        minHeight: theme.space[8],
        paddingHorizontal: theme.space[3],
      }}
      testID={testID}
    >
      <Icon color={theme.colors.inkMuted} name={SYNC_ICON} size={theme.size.iconSm} testID={`${testID}-icon`} />
      <UiText style={{ flexShrink: 1 }} tone="muted" variant="caption" weight={600}>
        {message}
      </UiText>
    </View>
  );
}
