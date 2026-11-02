import { View } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { Card, UiText } from '@/shared/ui';

import type { OccasionItem } from '../data/grid';
import { formatOccasionRange } from '../data/labels';
import { useHijriText } from '../hooks/useHijriText';

/**
 * One upcoming occasion (quran-app-screens.html, #HijriCalendar): a raised card with the name, the Hijri and Gregorian
 * dates, a days-away chip and a gold dot. The row order is the reading order, so it mirrors in Arabic by itself.
 */
export function OccasionRow({
  item,
  daysAway,
  locale,
  adjustDays,
  testID = 'occasion-row',
}: {
  item: OccasionItem;
  daysAway: number;
  locale: Locale;
  adjustDays: number;
  testID?: string;
}) {
  const tx = useHijriText();
  const theme = useTheme();
  const name = tx(`hijri.occasion.${item.id}`);
  const range = formatOccasionRange(item, locale, adjustDays);
  const away = tx('hijri.occasions.daysAway', { count: daysAway, number: formatNumber(daysAway, locale) });

  return (
    <Card accessibilityLabel={`${name}, ${range}, ${away}`} accessibilityRole="text" accessible padding={4} testID={testID}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }}>
        <View style={{ flex: 1, gap: theme.space[1] }}>
          <UiText variant="headline">{name}</UiText>
          <UiText tone="muted" variant="caption">
            {range}
          </UiText>
        </View>
        <View
          style={{
            backgroundColor: theme.colors.fillSecondary,
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.space[3],
            paddingVertical: theme.space[1],
          }}
          testID={`${testID}-chip`}
        >
          <UiText tone="muted" variant="caption">
            {away}
          </UiText>
        </View>
        <View
          style={{ backgroundColor: theme.colors.gold, borderRadius: 4, height: 8, width: 8 }}
          testID={`${testID}-dot`}
        />
      </View>
    </Card>
  );
}
