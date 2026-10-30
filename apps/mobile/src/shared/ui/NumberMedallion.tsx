import { formatNumber } from '@/core/i18n';

import { MedallionOutline } from './MedallionOutline';
import { UiText } from './UiText';

// The surah index's number: Arabic-Indic digits in Amiri inside a gold eight-point star (two squares, one turned 45°).
// Decorative; the row around it carries the label.
export function NumberMedallion({ number, testID }: { number: number; testID?: string }) {
  return (
    <MedallionOutline testID={testID}>
      <UiText align="center" variant="numeral">
        {formatNumber(number, 'ar')}
      </UiText>
    </MedallionOutline>
  );
}
