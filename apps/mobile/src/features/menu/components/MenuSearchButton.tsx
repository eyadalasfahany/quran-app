import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton } from '@/shared/ui';

const MAGNIFIER = { ios: 'magnifyingglass', android: 'search' } as const;

/**
 * The menu's floating search button (quran-app-screens.html, #Menu): a raised 44 pt disc at the lower left, above the
 * tab bar. It opens search; `bottom` is the clearance the screen computes for the bar.
 */
export function MenuSearchButton({
  bottom,
  onPress,
  testID = 'menu-search',
}: {
  bottom: number;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View pointerEvents="box-none" style={{ bottom, left: theme.space[5], position: 'absolute' }}>
      <IconButton icon={MAGNIFIER} label={t('menu.searchLabel')} onPress={onPress} testID={testID} variant="raised" />
    </View>
  );
}
