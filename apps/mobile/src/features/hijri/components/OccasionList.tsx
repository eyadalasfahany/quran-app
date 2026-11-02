import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { occasionDaysAway } from '../data/labels';
import { type OccasionItem } from '../data/grid';
import { OccasionRow } from './OccasionRow';

/**
 * The upcoming occasions under the calendar (quran-app-screens.html, #HijriCalendar): a section title over one row per
 * occasion, or a muted line when none is near. In the expanded window the parent places it in the side panel.
 */
export function OccasionList({
  items,
  today,
  locale,
  adjustDays,
  testID = 'occasion-list',
}: {
  items: OccasionItem[];
  today: Date;
  locale: Locale;
  adjustDays: number;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[3] }} testID={testID}>
      <UiText accessibilityRole="header" tone="muted" variant="headline">
        {t('hijri.occasions.title')}
      </UiText>
      {items.length === 0 ? (
        <UiText testID={`${testID}-empty`} tone="muted" variant="body">
          {t('hijri.occasions.empty')}
        </UiText>
      ) : (
        items.map((item) => (
          <OccasionRow
            adjustDays={adjustDays}
            daysAway={occasionDaysAway(item, today)}
            item={item}
            key={`${item.id}-${item.start.gregorian.getTime()}`}
            locale={locale}
            testID={`${testID}-row-${item.id}-${item.start.gregorian.getTime()}`}
          />
        ))
      )}
    </View>
  );
}
