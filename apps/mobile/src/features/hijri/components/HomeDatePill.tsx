import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, UiText } from '@/shared/ui';

const CALENDAR = { ios: 'calendar', android: 'calendar_month' } as const;
const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;

/**
 * The Hijri date pill under the Home header (screens/, #HomeHijriDate): a 36 pt fillSecondary pill with a
 * calendar glyph, the date and a chevron. It opens the Hijri calendar. The chevron is mirrored with the layout.
 */
export function HomeDatePill({
  label,
  text,
  onPress,
  testID = 'home-date-pill',
}: {
  /** The spoken label, «التقويم الهجري: …». */
  label: string;
  /** The visible date line, already in the locale's digits. */
  text: string;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: pressed ? theme.colors.fillTrack : theme.colors.fillSecondary,
        borderRadius: theme.radius.pill,
        flexDirection: 'row',
        gap: theme.space[2],
        minHeight: 44,
        paddingHorizontal: theme.space[3],
      })}
      testID={testID}
    >
      <Icon color={theme.colors.brand} name={CALENDAR} size={18} />
      <UiText tone="ink" variant="caption">
        {text}
      </UiText>
      <Icon color={theme.colors.inkMuted} mirrorInRtl name={CHEVRON} size={16} />
    </Pressable>
  );
}
