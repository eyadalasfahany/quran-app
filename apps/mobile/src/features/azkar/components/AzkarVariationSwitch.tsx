import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber } from '@/core/i18n';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { SegmentedControl } from '@/shared/ui';

import type { AzkarVariation } from '../data/model';

/**
 * Switches between an entry's alternative wordings. Labelled neutrally «الصيغة ١» / «الصيغة ٢»: upstream labels are
 * English editorial text and are not shown. The parent renders this only for two or more alternatives.
 */
export function AzkarVariationSwitch({
  variations,
  activeVariation,
  onChange,
  testID = 'azkar-variation-switch',
}: {
  variations: readonly AzkarVariation[];
  activeVariation: string;
  onChange: (variationKey: string) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();

  return (
    <View style={{ alignItems: 'center', paddingHorizontal: theme.space[4] }} testID={testID}>
      <SegmentedControl
        onChange={onChange}
        options={variations.map((variation) => ({
          key: variation.key,
          label: t('azkar.reader.variation', { n: formatNumber(variation.labelIndex, locale) }),
        }))}
        testID={`${testID}-options`}
        value={activeVariation}
      />
    </View>
  );
}
