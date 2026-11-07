import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

import { formatHadithNumber } from '../format';

import { HadithSourceLine } from './HadithSourceLine';

const ROW_PADDING_Y = 10;

/** The docked «المصدر والتفاصيل» panel of the expanded reader. The screen sets the width. No grade row (D4). */
export function HadithDetailsPanel({
  collectionTitle,
  bookTitle,
  hadithNumber,
  attribution,
  sourceCode = null,
  sourceUrl,
  testID = 'hadith-details-panel',
}: {
  collectionTitle: string;
  bookTitle: string;
  hadithNumber: string;
  attribution: string | null;
  sourceUrl: string | null;
  sourceCode?: string | null;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const colors = useContrastColors();
  const rows = [
    { key: 'collection', label: t('hadith.details.collection'), value: collectionTitle },
    { key: 'book', label: t('hadith.details.book'), value: bookTitle },
    { key: 'number', label: t('hadith.details.number'), value: formatHadithNumber(hadithNumber, locale) },
  ];

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.xl,
        borderWidth: theme.stroke.hairline,
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 18,
      }}
      testID={testID}
    >
      <UiText accessibilityRole="header" testID={`${testID}-title`} variant="headline">
        {t('hadith.details.title')}
      </UiText>
      {rows.map((row) => (
        <View
          key={row.key}
          style={{
            borderBottomColor: colors.line,
            borderBottomWidth: theme.stroke.hairline,
            gap: 2,
            paddingVertical: ROW_PADDING_Y,
          }}
          testID={`${testID}-row-${row.key}`}
        >
          <UiText testID={`${testID}-label-${row.key}`} tone="muted" variant="label" weight={400}>
            {row.label}
          </UiText>
          <UiText testID={`${testID}-value-${row.key}`} variant="subhead">
            {row.value}
          </UiText>
        </View>
      ))}
      <View style={{ gap: 2, paddingVertical: ROW_PADDING_Y }} testID={`${testID}-row-source`}>
        <UiText testID={`${testID}-label-source`} tone="muted" variant="label" weight={400}>
          {t('hadith.details.source')}
        </UiText>
        <HadithSourceLine
          attribution={attribution}
          sourceCode={sourceCode}
          sourceUrl={sourceUrl}
          testID={`${testID}-value-source`}
        />
      </View>
    </View>
  );
}
