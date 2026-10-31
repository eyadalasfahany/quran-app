import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber } from '@/core/i18n';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import type { AzkarItemDetail } from '../data/model';

/** The Arabic text of a step's plain segments (instruction or narration), in order. Quran segments are not steps. */
export function stepText(item: AzkarItemDetail): string {
  return item.segments
    .map((segment) => segment.textAr)
    .filter((text): text is string => text !== null && text.trim().length > 0)
    .join(' ');
}

/**
 * A preface or afterword around a unit (muted, subhead style), and the repeat-group header «تُكرَّر هذه المجموعة ٣ مرات»
 * when `repeatCount` is set. Renders nothing when there is neither.
 */
export function AzkarStepNote({
  items,
  repeatCount = null,
  testID = 'azkar-step-note',
}: {
  items: readonly AzkarItemDetail[];
  repeatCount?: number | null;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const lines = items.map(stepText).filter((text) => text.length > 0);

  if (lines.length === 0 && repeatCount === null) {
    return null;
  }

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      {repeatCount === null ? null : (
        <UiText align="center" testID={`${testID}-repeat`} tone="muted" variant="caption">
          {t('azkar.reader.repeatGroup', { count: formatNumber(repeatCount, locale) })}
        </UiText>
      )}
      {lines.map((line, index) => (
        <UiText align="center" key={index} tone="muted" variant="subhead">
          {line}
        </UiText>
      ))}
    </View>
  );
}
