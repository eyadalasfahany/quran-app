import { View } from 'react-native';

import type { Locale } from '@/core/i18n/locale';
import { UiText } from '@/shared/ui';

import { weekdayLabels } from '../data/grid';

/** The weekday letters over the month grid, Saturday first in Arabic and Sunday first in English. */
export function HijriWeekdayRow({ locale, testID = 'hijri-weekday-row' }: { locale: Locale; testID?: string }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row' }} testID={testID}>
      {weekdayLabels(locale).map((label, index) => (
        <UiText key={`${index}-${label}`} style={{ flex: 1, textAlign: 'center' }} testID={`${testID}-${index}`} tone="muted" variant="caption">
          {label}
        </UiText>
      ))}
    </View>
  );
}
