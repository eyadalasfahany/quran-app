import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

const BACK_ICON = { ios: 'chevron.left', android: 'chevron_left' } as const;

/**
 * The picker's header (quran-app-screens.html, #AdhanSoundPicker): the raised back button on its own line, and the large
 * title «صوت الأذان» under it, both at the start edge.
 */
export function AdhanSoundHeader({
  title,
  onBack,
  testID = 'adhan-sound-header',
}: {
  title: string;
  onBack: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[4] }} testID={testID}>
      <IconButton
        icon={BACK_ICON}
        label={t('settings.back')}
        mirrorInRtl
        onPress={onBack}
        testID={`${testID}-back`}
        variant="raised"
      />
      <UiText accessibilityRole="header" variant="displayMd">
        {title}
      </UiText>
    </View>
  );
}
