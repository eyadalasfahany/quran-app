import { useTranslation } from 'react-i18next';
import { Text, View, type TextStyle } from 'react-native';

import { uiFontFamilies, useTheme } from '@/core/theme';
import { arabicTextDirection, UiText } from '@/shared/ui';

/** One source's explanation of a hadith, as the data step maps it. Text is shown as given, never trimmed or edited. */
export type HadithExplanationView = {
  sourceName: string;
  explanation: string;
  benefits?: string[] | null;
  wordMeanings?: { word: string; meaning: string }[] | null;
  intro?: string | null;
};

type HadithExplanationCardProps = HadithExplanationView & { testID?: string };

// Frames HadithCollReaderExplained and its English sibling: body 17 over 1.8 in IBM Plex Sans Arabic (ADR 0078).
const BODY_LINE_HEIGHT = 30.6;

// Explanation text is not hadith text: the UI font, RTL, justified, even in the English UI.
const explanationText: TextStyle = { ...arabicTextDirection, lineHeight: BODY_LINE_HEIGHT, textAlign: 'justify' };
const listText: TextStyle = { ...arabicTextDirection, lineHeight: BODY_LINE_HEIGHT };

/** The explanation of one hadith from one source: the card under the hadith card (the explanation frames). */
export function HadithExplanationCard({
  sourceName,
  explanation,
  benefits,
  wordMeanings,
  intro,
  testID = 'hadith-explanation-card',
}: HadithExplanationCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const hasBenefits = (benefits?.length ?? 0) > 0;
  const hasWordMeanings = (wordMeanings?.length ?? 0) > 0;

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceRaised,
        borderRadius: theme.radius.hero,
        gap: theme.size.blockGap,
        paddingHorizontal: theme.space[5],
        paddingVertical: theme.size.cardPadding,
      }}
      testID={testID}
    >
      <View style={{ gap: 2 }}>
        <UiText accessibilityRole="header" testID={`${testID}-title`} variant="headline">
          {t('hadith.explanation.title')}
        </UiText>
        <UiText testID={`${testID}-source`} tone="muted" variant="caption">
          {sourceName}
        </UiText>
      </View>
      {intro ? (
        <UiText accessibilityLanguage="ar" style={explanationText} testID={`${testID}-intro`} variant="body">
          {intro}
        </UiText>
      ) : null}
      <UiText accessibilityLanguage="ar" style={explanationText} testID={`${testID}-body`} variant="body">
        {explanation}
      </UiText>
      {hasBenefits ? (
        <View style={{ gap: 6 }} testID={`${testID}-benefits`}>
          <UiText accessibilityRole="header" variant="subhead" weight={600}>
            {t('hadith.explanation.benefits')}
          </UiText>
          <View accessibilityRole="list" style={{ gap: 6 }}>
            {benefits?.map((benefit, index) => (
              <View key={index} style={{ flexDirection: 'row', gap: 8 }} testID={`${testID}-benefit-${index}`}>
                <UiText accessible={false} importantForAccessibility="no" variant="body">
                  {'•'}
                </UiText>
                <UiText accessibilityLanguage="ar" style={[listText, { flex: 1 }]} variant="body">
                  {benefit}
                </UiText>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {hasWordMeanings ? (
        <View style={{ gap: 6 }} testID={`${testID}-words`}>
          <UiText accessibilityRole="header" variant="subhead" weight={600}>
            {t('hadith.explanation.wordMeanings')}
          </UiText>
          {wordMeanings?.map(({ word, meaning }, index) => (
            <UiText
              accessibilityLanguage="ar"
              key={index}
              style={listText}
              testID={`${testID}-word-${index}`}
              variant="body"
            >
              <Text style={{ fontFamily: uiFontFamilies[600] }}>{`${word}:`}</Text>
              {` ${meaning}`}
            </UiText>
          ))}
        </View>
      ) : null}
    </View>
  );
}
