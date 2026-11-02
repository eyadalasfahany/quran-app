import { View } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';

import type { HijriCell } from '../data/grid';
import { formatGregorianDay, formatHijriMonthYear } from '../data/labels';
import type { OccasionId } from '../data/occasions';
import { useHijriText } from '../hooks/useHijriText';
import { HijriDayCell } from './HijriDayCell';

/** `yyyy-m-d`, the key the today check compares. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/**
 * The 7-column month grid (quran-app-screens.html, #HijriCalendar). Rows are whole weeks and the neighbour days are
 * dimmed. With `largeText` it becomes a day list, one day per row, since seven narrow columns cannot hold large text.
 */
export function HijriMonthGrid({
  cells,
  locale,
  todayKey,
  adjustDays,
  largeText = false,
  testID = 'hijri-month-grid',
}: {
  cells: HijriCell[];
  locale: Locale;
  /** `dayKey` of today in the adjusted calendar, so the today cell is the one whose day matches. */
  todayKey: string;
  /** The user's adjustment, so the spoken Hijri month matches the adjusted numbers. */
  adjustDays: number;
  largeText?: boolean;
  testID?: string;
}) {
  const tx = useHijriText();
  const theme = useTheme();

  const occasionText = (id: OccasionId) => tx(`hijri.occasion.${id.startsWith('whiteDay') ? 'whiteDays' : id}`);

  const dayView = (cell: HijriCell, key: string) => {
    const isToday = dayKey(cell.gregorian) === todayKey;
    const occasion = cell.occasions[0];
    const hijriDay = formatNumber(cell.hijri.day, locale);
    const gregorianDay = formatGregorianDay(cell.gregorian, locale);
    const hijriFull = `${hijriDay} ${formatHijriMonthYear(cell.gregorian, locale, adjustDays)}`;
    const values = { hijri: hijriFull, gregorian: gregorianDay };
    const label = isToday
      ? tx('hijri.day.today', values)
      : occasion
        ? tx('hijri.day.occasion', { ...values, occasion: occasionText(occasion) })
        : tx('hijri.day.a11y', values);

    return (
      <HijriDayCell
        gregorian={formatNumber(cell.gregorian.getDate(), locale)}
        hijri={hijriDay}
        inMonth={cell.inMonth}
        isMarked={cell.occasions.length > 0}
        isToday={isToday}
        key={key}
        label={label}
        testID={`${testID}-day-${key}`}
      />
    );
  };

  if (largeText) {
    return (
      <View style={{ gap: theme.space[2] }} testID={testID}>
        {cells.filter((cell) => cell.inMonth).map((cell) => dayView(cell, dayKey(cell.gregorian)))}
      </View>
    );
  }

  const rows: HijriCell[][] = [];
  for (let start = 0; start < cells.length; start += 7) {
    rows.push(cells.slice(start, start + 7));
  }

  return (
    <View style={{ gap: theme.space[1] }} testID={testID}>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={{ flexDirection: 'row' }}>
          {row.map((cell) => dayView(cell, `${dayKey(cell.gregorian)}-${cell.inMonth ? 'in' : 'out'}`))}
        </View>
      ))}
    </View>
  );
}
