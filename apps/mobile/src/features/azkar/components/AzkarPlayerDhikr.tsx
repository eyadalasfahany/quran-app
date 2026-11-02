import { useMemo } from 'react';
import { useLocale } from '@/core/i18n/useLocale';
import { openContentDb } from '@/core/db/content/open';
import { useTheme } from '@/core/theme';
import { View } from 'react-native';

import type { ReaderUnit } from '../data/reader-units';
import { resolveQuranVerses } from '../data/quran-segments';
import { AzkarEnglishLine } from './AzkarEnglishLine';
import { DhikrText } from './DhikrText';

/**
 * The dhikr being recited, as the reader shows it: each counted item's Arabic through `DhikrText`, so Quran segments
 * render from content.db unchanged (ADR 0031 §4). The Quran is resolved once per unit here, never on a render.
 */
export function AzkarPlayerDhikr({
  unit,
  fontScale = 1,
  testID = 'azkar-player-dhikr',
}: {
  unit: ReaderUnit;
  fontScale?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const locale = useLocale();
  const { executor } = openContentDb();
  const quranVerses = useMemo(
    () => resolveQuranVerses(executor, [...unit.preface, ...unit.body, ...unit.afterword]),
    // Keyed on the unit and the locale: the unit's text changes only with them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [executor, unit.unitKey, locale],
  );

  return (
    <View style={{ gap: theme.space[4] }} testID={testID}>
      {unit.body.map((item) => (
        <View key={item.itemKey} style={{ gap: theme.space[2] }}>
          <DhikrText fontScale={fontScale} quranVerses={quranVerses} segments={item.segments} />
          <AzkarEnglishLine text={locale === 'en' ? item.textEn : null} />
        </View>
      ))}
    </View>
  );
}
