import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

/**
 * One day of the month grid (screens/, #HijriCalendar): the Hijri day large, the Gregorian day small,
 * a gold dot for an occasion, the brand fill for today, and a muted face for the neighbour days at the edges.
 */
export function HijriDayCell({
  hijri,
  gregorian,
  label,
  isToday = false,
  isMarked = false,
  inMonth = true,
  testID,
}: {
  /** The Hijri day number, already in the locale's digits. */
  hijri: string;
  /** The Gregorian day number, already in the locale's digits. */
  gregorian: string;
  /** The full spoken label: the Hijri and Gregorian date, today or the occasion. */
  label: string;
  isToday?: boolean;
  isMarked?: boolean;
  inMonth?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const hijriTone = isToday ? 'onBrand' : inMonth ? 'ink' : 'muted';
  const gregorianTone = isToday ? 'onBrand' : 'muted';

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="text"
      accessibilityState={{ selected: isToday }}
      accessible
      style={{
        alignItems: 'center',
        backgroundColor: isToday ? theme.colors.brand : 'transparent',
        borderRadius: theme.radius.md,
        flex: 1,
        justifyContent: 'center',
        minHeight: 52,
        paddingVertical: theme.space[1],
      }}
      testID={testID}
    >
      <UiText tone={hijriTone} variant="headline">
        {hijri}
      </UiText>
      <UiText tone={gregorianTone} variant="caption">
        {gregorian}
      </UiText>
      {isMarked ? (
        <View
          style={{
            backgroundColor: theme.colors.gold,
            borderRadius: 3,
            height: 5,
            marginTop: 2,
            width: 5,
          }}
          testID={testID ? `${testID}-marker` : undefined}
        />
      ) : null}
    </View>
  );
}
