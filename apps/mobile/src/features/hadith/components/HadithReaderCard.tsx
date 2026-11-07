import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { formatHadithNumber } from '../format';

import { HadithSourceLine } from './HadithSourceLine';
import { HadithText } from './HadithText';

// Frame HadithCollReaderPlain: the source line sits 6 below the text.
const SOURCE_PADDING_TOP = 6;

/** The reader's card: the number label, the text (the focus) and the source line. No border. */
export function HadithReaderCard({
  hadithNumber,
  text,
  chainEnd = null,
  attribution,
  sourceUrl,
  sourceCode = null,
  unavailable = false,
  fontScale = 1,
  testID = 'hadith-reader-card',
}: {
  hadithNumber: string;
  text: string;
  chainEnd?: number | null;
  attribution: string | null;
  sourceUrl: string | null;
  sourceCode?: string | null;
  /** A placeholder: no source has the text. The note replaces the text (ADR 0076). */
  unavailable?: boolean;
  fontScale?: number;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();

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
      <UiText tone="muted" testID={`${testID}-number`} variant="label" weight={400}>
        {t('hadith.reader.numberLabel', { number: formatHadithNumber(hadithNumber, locale) })}
      </UiText>
      {unavailable ? (
        <UiText tone="muted" testID={`${testID}-unavailable`} variant="body">
          {t('hadith.unavailable.title', { n: formatHadithNumber(hadithNumber, locale) })}
        </UiText>
      ) : (
        <HadithText chainEnd={chainEnd} fontScale={fontScale} testID={`${testID}-text`} text={text} variant="reader" />
      )}
      <View style={{ paddingTop: SOURCE_PADDING_TOP }}>
        <HadithSourceLine
          attribution={attribution}
          sourceCode={sourceCode}
          sourceUrl={sourceUrl}
          testID={`${testID}-source`}
        />
      </View>
    </View>
  );
}
