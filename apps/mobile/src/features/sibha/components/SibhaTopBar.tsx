import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, type IconName } from '@/shared/ui';

const CLOSE: IconName = { ios: 'xmark', android: 'close' };
const RESET: IconName = { ios: 'arrow.counterclockwise', android: 'restart_alt' };

/**
 * The misbaha's top row (quran-app-screens.html, #Sibha): close at the reading start, reset at the end. Both are 44 pt
 * raised discs. Reset asks the screen to confirm before it clears the count.
 */
export function SibhaTopBar({
  onClose,
  onReset,
  testID = 'sibha-top-bar',
}: {
  onClose: () => void;
  onReset: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }} testID={testID}>
      <IconButton
        icon={CLOSE}
        iconSize={theme.size.icon}
        label={t('sibha.close')}
        onPress={onClose}
        testID={`${testID}-close`}
        variant="raised"
      />
      <IconButton
        icon={RESET}
        iconSize={theme.size.icon}
        label={t('sibha.reset')}
        onPress={onReset}
        testID={`${testID}-reset`}
        variant="raised"
      />
    </View>
  );
}
