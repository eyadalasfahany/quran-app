import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { Card, UiText, useContrastColors } from '@/shared/ui';

import { addDays } from '../data/plan';

const COLUMNS = 10;
const CELL_HEIGHT = 14;
const CELL_RADIUS = 4;
// Frame future cells: darker empty borders use lineStrong; lighter ones use line.
const TODAY_BORDER = 2;

export function KhatmaProgressGrid({
  durationDays,
  dayIndex,
  loggedDates,
  today,
  startDate,
  testID = 'khatma-progress-grid',
}: {
  durationDays: number;
  dayIndex: number;
  loggedDates: ReadonlySet<string>;
  today: string;
  startDate: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const locale = useLocale();

  const filledCount = useMemo(() => {
    let count = 0;
    for (let index = 0; index < durationDays; index += 1) {
      if (loggedDates.has(addDays(startDate, index))) {
        count += 1;
      }
    }
    return count;
  }, [durationDays, loggedDates, startDate]);

  const summary = t('khatma.progressA11y', {
    day: formatNumber(dayIndex, locale),
    filled: formatNumber(filledCount, locale),
    total: formatNumber(durationDays, locale),
  });

  const rows = useMemo(() => {
    const result: number[][] = [];
    for (let index = 0; index < durationDays; index += COLUMNS) {
      result.push(Array.from({ length: Math.min(COLUMNS, durationDays - index) }, (_, offset) => index + offset));
    }
    return result;
  }, [durationDays]);

  return (
    <Card accessibilityLabel={summary} accessibilityRole="summary" testID={testID}>
      <View style={{ gap: theme.space[2] }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
          <UiText variant="headline">{t('khatma.progressTitle')}</UiText>
          <UiText tone="muted" variant="label">
            {t('khatma.progressDay', { day: formatNumber(dayIndex, locale) })}
          </UiText>
        </View>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ gap: theme.space[2] }}
          testID={`${testID}-cells`}
        >
          {rows.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={{ flexDirection: 'row', gap: theme.space[2] }}>
              {row.map((index) => {
                const date = addDays(startDate, index);
                const filled = loggedDates.has(date);
                const isToday = date === today;
                const futureStrong = index + 1 >= dayIndex;
                const borderColor = filled ? theme.colors.brand : futureStrong ? colors.lineStrong : colors.line;
                return (
                  <View
                    key={date}
                    style={{
                      backgroundColor: filled ? theme.colors.brand : 'transparent',
                      borderColor,
                      borderRadius: CELL_RADIUS,
                      borderWidth: filled ? theme.stroke.hairline : isToday ? TODAY_BORDER : theme.stroke.hairline,
                      flex: 1,
                      height: CELL_HEIGHT,
                    }}
                    testID={`${testID}-cell-${index}`}
                  />
                );
              })}
              {row.length < COLUMNS
                ? Array.from({ length: COLUMNS - row.length }, (_, spacer) => (
                    <View key={`spacer-${spacer}`} style={{ flex: 1, height: CELL_HEIGHT }} />
                  ))
                : null}
            </View>
          ))}
        </View>
        <UiText tone="muted" variant="label" weight={400}>
          {t('khatma.progressFootnote')}
        </UiText>
      </View>
    </Card>
  );
}
