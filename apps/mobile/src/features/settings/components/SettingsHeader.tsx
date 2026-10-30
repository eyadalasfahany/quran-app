import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

const BACK_ICON = { ios: 'chevron.left', android: 'chevron_left' } as const;

export function SettingsHeader({
  onBack,
  title,
  testID = 'settings-header',
}: {
  onBack?: () => void;
  title?: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: theme.space[2],
      }}
      testID={testID}
    >
      {onBack ? (
        <IconButton
          icon={BACK_ICON}
          label={t('settings.back')}
          mirrorInRtl
          onPress={onBack}
          testID="settings-back"
          variant="raised"
        />
      ) : null}
      <UiText
        accessibilityRole="header"
        style={{ flex: 1 }}
        variant="displayMd"
      >
        {title ?? t('settings.title')}
      </UiText>
    </View>
  );
}

