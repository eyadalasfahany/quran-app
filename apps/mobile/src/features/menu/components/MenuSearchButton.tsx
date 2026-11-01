import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton } from '@/shared/ui';

const MAGNIFIER = { ios: 'magnifyingglass', android: 'search' } as const;

/**
 * The menu's floating search button (quran-app-screens.html, #Menu): a raised 44 pt disc at the lower left in both
 * Arabic and English, above the tab bar. `bottom` is the clearance the screen computes for the bar.
 *
 * The row spans the screen and is laid out LTR, so the disc sits at the left edge whatever the reading direction.
 * Positioned with `left` alone, the disc would move to the right edge in Arabic.
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
    <View
      pointerEvents="box-none"
      style={{
        bottom,
        direction: 'ltr',
        flexDirection: 'row',
        left: 0,
        paddingHorizontal: theme.space[5],
        position: 'absolute',
        right: 0,
      }}
      testID={`${testID}-row`}
    >
      <IconButton icon={MAGNIFIER} label={t('menu.searchLabel')} onPress={onPress} testID={testID} variant="raised" />
    </View>
  );
}
