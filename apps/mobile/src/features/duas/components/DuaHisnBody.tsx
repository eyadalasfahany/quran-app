import { View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import type { ReaderUnit } from '@/features/azkar/data';
import { AzkarEnglishLine } from '@/features/azkar/components/AzkarEnglishLine';
import { AzkarStepNote } from '@/features/azkar/components/AzkarStepNote';
import { AzkarVariationSwitch } from '@/features/azkar/components/AzkarVariationSwitch';
import { DhikrText } from '@/features/azkar/components/DhikrText';

/**
 * The text of a Hisn dua, rendered the way the Azkar reader renders it: the same segments through `DhikrText` (Quran in
 * the Quran font), the same steps and English line. No counter, no source line (ADR 0091 decision 11).
 */
export function DuaHisnBody({
  units,
  fontScale = 1,
  quranVerses,
  onChooseVariation,
  testID = 'dua-hisn-body',
}: {
  units: readonly ReaderUnit[];
  fontScale?: number;
  quranVerses: ReadonlyMap<string, readonly string[]>;
  onChooseVariation: (variationKey: string) => void;
  testID?: string;
}) {
  const theme = useTheme();
  const locale = useLocale();
  const first = units[0];

  return (
    <View style={{ gap: theme.space[5], paddingHorizontal: theme.space[2] }} testID={testID}>
      {first !== undefined && first.variations.length > 1 ? (
        <AzkarVariationSwitch activeVariation={first.activeVariation} onChange={onChooseVariation} variations={first.variations} />
      ) : null}
      {units.map((unit) => (
        <View key={unit.unitKey} style={{ gap: theme.space[5] }}>
          <AzkarStepNote items={unit.preface} />
          {unit.body.map((item) => (
            <View key={item.itemKey} style={{ gap: theme.space[2] }}>
              <DhikrText fontScale={fontScale} quranVerses={quranVerses} segments={item.segments} />
              <AzkarEnglishLine text={locale === 'en' ? item.textEn : null} />
            </View>
          ))}
          <AzkarStepNote items={unit.afterword} />
        </View>
      ))}
    </View>
  );
}
