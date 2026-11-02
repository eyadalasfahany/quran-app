import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName, UiText, useContrastColors } from '@/shared/ui';

const AZKAR_ICON: IconName = { ios: 'circle.dotted', android: 'scatter_plot' };
const CHEVRON: IconName = { ios: 'chevron.right', android: 'chevron_right' };
// The glyph tile is 48 pt with 14 pt corners, and 12 pt between its parts (quran-app-screens.html, #Main).
const TILE_SIZE = 48;
const TILE_RADIUS = 14;
const ROW_GAP = 12;

/**
 * One «آخر الأذكار» row (quran-app-screens.html, #Main): the Azkar glyph on a soft tile, the scope's name, its count
 * («١٢ من ٢٤») and a chevron. It opens the reader where the user left off.
 */
export function RecentAzkarRow({
  title,
  meta,
  onPress,
  testID = 'home-recent-azkar-row',
}: {
  title: string;
  meta: string;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <Pressable
      accessibilityLabel={t('common.a11yPair', { label: title, title: meta })}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ alignItems: 'center', flexDirection: 'row', gap: ROW_GAP, opacity: pressed ? theme.opacity.pressed : 1 })}
      testID={testID}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.fillSecondary,
          borderRadius: TILE_RADIUS,
          flexShrink: 0,
          height: TILE_SIZE,
          justifyContent: 'center',
          width: TILE_SIZE,
        }}
      >
        <Icon color={theme.colors.brand} name={AZKAR_ICON} size={theme.size.icon} />
      </View>
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <UiText variant="headline">{title}</UiText>
        <UiText tone="muted" variant="caption">
          {meta}
        </UiText>
      </View>
      <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={theme.size.iconSm} />
    </Pressable>
  );
}
