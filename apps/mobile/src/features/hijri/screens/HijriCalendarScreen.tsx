import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ContentColumn, useIsShortWindow, useWindowClass } from '@/core/layout';
import { useLocale } from '@/core/i18n/useLocale';
import { formatNumber } from '@/core/i18n/numbers';
import { useTheme } from '@/core/theme';
import { AzkarScreenHeader } from '@/features/azkar/components/AzkarScreenHeader';
import { EmptyState, Screen, IconButton } from '@/shared/ui';

import { useHijriAdjustment } from '../data/adjustment';
import { isHijriCalendarAvailable, toHijri } from '../data/hijri-date';
import { groupOccasions, monthCells } from '../data/grid';
import { formatGregorianDay, formatHijriMonthYear, formatSignedDays } from '../data/labels';
import { hijriMonth } from '../data/month';
import { upcomingOccasions } from '../data/occasions';
import { HijriAdjustRow } from '../components/HijriAdjustRow';
import { HijriMonthGrid, dayKey } from '../components/HijriMonthGrid';
import { HijriMonthHeader } from '../components/HijriMonthHeader';
import { HijriNote } from '../components/HijriNote';
import { HijriWeekdayRow } from '../components/HijriWeekdayRow';
import { OccasionList } from '../components/OccasionList';
import { useLargeText } from '../hooks/useLargeText';

const SLIDERS = { ios: 'slider.horizontal.3', android: 'tune' } as const;
const CALENDAR = { ios: 'calendar', android: 'calendar_month' } as const;
const OCCASION_COUNT = 6;

/**
 * The Hijri calendar (quran-app-screens.html, #HijriCalendar; route `/hijri`). A pushed screen that mirrors the Azkar
 * header. Month navigation, a «اليوم» return, the adjustment row and the upcoming occasions. In a short or expanded
 * window the grid and the occasions sit side by side. Without the platform calendar the screen says so and offers
 * nothing else (a capability check, not a switch).
 */
export function HijriCalendarScreen({ now, testID = 'screen-hijri-calendar' }: { now?: Date; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const [adjust] = useHijriAdjustment();
  const short = useIsShortWindow();
  const windowClass = useWindowClass();
  const largeText = useLargeText();
  const [today] = useState(() => now ?? new Date());
  const [shown, setShown] = useState<{ year: number; month: number } | null>(null);

  const todayHijri = isHijriCalendarAvailable() ? toHijri(today, adjust) : null;
  const current = shown ?? (todayHijri ? { year: todayHijri.year, month: todayHijri.month } : null);
  const month = current ? hijriMonth(current.year, current.month, adjust) : null;

  const header = (
    <AzkarScreenHeader
      onBack={() => router.back()}
      testID="hijri-screen-header"
      title={t('hijri.title')}
      trailing={
        <IconButton
          icon={SLIDERS}
          label={t('hijri.adjust.open')}
          onPress={() => router.push('/hijri/adjust' as Href)}
          testID="hijri-adjust-button"
          variant="raised"
        />
      }
    />
  );

  if (!todayHijri || !current || !month) {
    return (
      <Screen testID={testID}>
        <ContentColumn gutter={theme.size.gutterHome}>
          <View style={{ flex: 1, gap: theme.space[5], paddingTop: theme.space[2] }}>
            {header}
            <EmptyState icon={CALENDAR} testID="hijri-unavailable" title={t('hijri.unavailable')} />
          </View>
        </ContentColumn>
      </Screen>
    );
  }

  const first = month.days[0]!.gregorian;
  const last = month.days[month.days.length - 1]!.gregorian;
  const cells = monthCells(month, adjust, locale);
  const items = groupOccasions(upcomingOccasions(today, adjust, OCCASION_COUNT));
  const away = current.year !== todayHijri.year || current.month !== todayHijri.month;
  const shift = (delta: number) => {
    const index = current.year * 12 + (current.month - 1) + delta;
    setShown({ year: Math.floor(index / 12), month: (index % 12) + 1 });
  };
  const subtitle = t('hijri.gregorianRange', {
    from: formatGregorianDay(first, locale),
    to: `${formatGregorianDay(last, locale)} ${formatNumber(last.getFullYear(), locale)}`,
  });
  const adjustValue = t('hijri.adjust.value', { value: formatSignedDays(adjust, locale) });

  const grid = (
    <View style={{ gap: theme.space[3] }}>
      <HijriMonthHeader
        onNext={() => shift(1)}
        onPrevious={() => shift(-1)}
        onToday={away ? () => setShown(null) : undefined}
        subtitle={subtitle}
        title={formatHijriMonthYear(first, locale, adjust)}
      />
      <HijriWeekdayRow locale={locale} />
      <HijriMonthGrid
        adjustDays={adjust}
        cells={cells}
        largeText={largeText}
        locale={locale}
        todayKey={dayKey(today)}
      />
      <HijriNote text={t('hijri.note')} />
      <HijriAdjustRow onPress={() => router.push('/hijri/adjust' as Href)} valueLabel={adjustValue} />
    </View>
  );

  const occasions = (
    <OccasionList adjustDays={adjust} items={items} locale={locale} today={today} />
  );

  // The wider windows (a short phone, expanded) put the occasions beside the grid, not under it (ADR 0036).
  const sideBySide = short || windowClass === 'expanded';

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <ScrollView contentContainerStyle={{ gap: theme.space[5], paddingBottom: theme.space[8], paddingTop: theme.space[2] }}>
          {header}
          {sideBySide ? (
            <View style={{ flexDirection: 'row', gap: theme.space[5] }}>
              <View style={{ flex: 1 }}>{grid}</View>
              <View style={{ flex: 1 }}>{occasions}</View>
            </View>
          ) : (
            <View style={{ gap: theme.space[5] }}>
              {grid}
              {occasions}
            </View>
          )}
        </ScrollView>
      </ContentColumn>
    </Screen>
  );
}
