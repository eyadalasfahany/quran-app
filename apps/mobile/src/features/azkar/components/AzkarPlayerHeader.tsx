import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, UiText, type IconName } from '@/shared/ui';

const MINIMIZE = { ios: 'chevron.down', android: 'keyboard_arrow_down' } as const satisfies IconName;

/** The full player's top row: minimise on the start edge, a caption in the middle. It balances the button on the end edge. */
export function AzkarPlayerHeader({
  caption,
  onMinimize,
  testID = 'azkar-player-header',
}: {
  caption: string;
  onMinimize: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }} testID={testID}>
      <IconButton icon={MINIMIZE} label={t('player.minimize')} onPress={onMinimize} testID={`${testID}-minimize`} tone="ink" variant="plain" />
      <UiText accessibilityRole="header" tone="muted" variant="caption" weight={500}>
        {caption}
      </UiText>
      <View style={{ height: theme.size.touchTarget, width: theme.size.touchTarget }} />
    </View>
  );
}
