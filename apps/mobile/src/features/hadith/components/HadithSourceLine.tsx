import { useTranslation } from 'react-i18next';
import { Linking, Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { arabicTextDirection, UiText } from '@/shared/ui';

import { hadithCreditKey } from '../source-credit';

// The gap between the credit and the attribution line (theme.space[1] is 4; the frames use 2).
const LINE_GAP = 2;

/**
 * The source credit and, when given, the attribution. A null or empty source URL draws the credit as plain
 * text, with no link (fawazahmed0 sets no URL). The attribution stays Arabic, right to left, in both languages.
 */
export function HadithSourceLine({
  attribution,
  sourceUrl,
  align = 'start',
  sourceCode = null,
  testID = 'hadith-source-line',
}: {
  attribution: string | null;
  sourceUrl: string | null;
  /** The row's own `source_code`; picks the credit line (ADR 0076). */
  sourceCode?: string | null;
  align?: 'start' | 'center';
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const centred = align === 'center';
  const hasAttribution = attribution !== null && attribution !== '';
  const credit = t(hadithCreditKey(sourceCode));

  const creditNode =
    sourceUrl === null ? (
      <UiText testID={`${testID}-credit`} tone="muted" variant="label" weight={400}>
        {credit}
      </UiText>
    ) : (
      <Pressable
        accessibilityLabel={t('hadith.source.open')}
        accessibilityRole="link"
        onPress={() => {
          void Linking.openURL(sourceUrl);
        }}
        style={{ justifyContent: 'center', minHeight: theme.size.touchTarget }}
        testID={`${testID}-link`}
      >
        <UiText tone="brand" variant="label" weight={400}>
          {credit}
        </UiText>
      </Pressable>
    );

  return (
    <View style={{ alignItems: centred ? 'center' : 'flex-start', gap: LINE_GAP }} testID={testID}>
      {creditNode}
      {hasAttribution ? (
        <UiText
          style={centred ? { ...arabicTextDirection, textAlign: 'center' } : arabicTextDirection}
          testID={`${testID}-attribution`}
          tone="muted"
          variant="label"
        >
          {attribution}
        </UiText>
      ) : null}
    </View>
  );
}
