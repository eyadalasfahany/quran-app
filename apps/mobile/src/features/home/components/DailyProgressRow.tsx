import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName, UiText } from '@/shared/ui';

const DONE: IconName = { ios: 'checkmark.circle', android: 'check_circle' };
const OPEN: IconName = { ios: 'circle', android: 'radio_button_unchecked' };
// The row is at least 36 pt tall (quran-app-screens.html, #Main «تقدّم اليوم»).
const ROW_MIN_HEIGHT = 36;

/**
 * One goal in Home's progress card: a status mark, the goal's name, and its count («٤ من ٢١ صفحة», «مكتمل»). A done
 * goal's mark is brand, an open one muted.
 */
export function DailyProgressRow({
  label,
  value,
  done,
  testID = 'daily-progress-row',
}: {
  label: string;
  value: string;
  done: boolean;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View
      accessibilityLabel={`${label}, ${value}`}
      accessibilityRole="text"
      accessibilityState={{ checked: done }}
      style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2], minHeight: ROW_MIN_HEIGHT }}
      testID={testID}
    >
      <Icon color={done ? theme.colors.brand : theme.colors.inkMuted} name={done ? DONE : OPEN} size={theme.size.iconSm} />
      <UiText style={{ flex: 1, minWidth: 0 }} variant="subhead">
        {label}
      </UiText>
      <UiText tone="muted" variant="caption">
        {value}
      </UiText>
    </View>
  );
}
