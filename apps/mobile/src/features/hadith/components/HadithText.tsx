import { Text } from 'react-native';

import { uiFontFamilies, useTheme } from '@/core/theme';
import { displayText, UiText } from '@/shared/ui';

// Frames HadithCollBook, HadithCollSaved and HadithCollSearchResults draw previews at 19 over 36 (1.89x).
// The typeScale token dhikrList is 19 over 34 (1.79x), below the 1.8x rule, so the preview uses this constant.
const HADITH_PREVIEW_LINE_HEIGHT = 36;
const HADITH_PREVIEW_FONT_SIZE = 19;
const PREVIEW_LINES = 3;

// Hadith text is justified RTL in both UI languages (ADR 0042 section 6). Not centred, never arabicTextDirection.
const TEXT_DIRECTION = { textAlign: 'justify', writingDirection: 'rtl' } as const;
// Hadith text uses the tafsir body face (IBM Plex Sans Arabic), not Amiri (developer, 8 Nov 2026). Sizes stay as before.
const HADITH_FONT = { fontFamily: uiFontFamilies[400] } as const;
const QUOTE = '"';

/**
 * Splits text at its straight double quotes; odd parts are the quoted words (the Prophet's speech, ﷺ), marks included.
 * With no quotes or an unbalanced count the text stays one plain part, so a stray mark never colours the rest.
 */
export function quoteParts(text: string): { text: string; quoted: boolean }[] {
  const pieces = text.split(QUOTE);
  if (pieces.length < 3 || pieces.length % 2 === 0) return [{ text, quoted: false }];
  return pieces
    .map((piece, index) => (index % 2 === 1 ? { text: QUOTE + piece + QUOTE, quoted: true } : { text: piece, quoted: false }))
    .filter((part) => part.text !== '');
}

/**
 * The one place hadith text is drawn. The string is rendered as given: nothing is trimmed, normalised or
 * truncated here; quoted words are only coloured gold (as tafsir colours Quran quotes). `chainEnd` splits off the narrator chain, but only for a valid offset inside the text.
 */
export function HadithText({
  text,
  variant,
  numberOfLines,
  chainEnd = null,
  fontScale = 1,
  testID = 'hadith-text',
}: {
  text: string;
  variant: 'reader' | 'preview';
  numberOfLines?: number;
  chainEnd?: number | null;
  /** The reader's text-size setting; the reader's sizes are multiplied by it. */
  fontScale?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const isReader = variant === 'reader';
  const hasChain = chainEnd !== null && Number.isInteger(chainEnd) && chainEnd > 0 && chainEnd < text.length;

  const rest = hasChain ? text.slice(chainEnd) : text;
  const quoted = quoteParts(rest).map((part, index) =>
    part.quoted ? (
      <Text key={`q${index}`} style={{ color: theme.colors.gold }} testID={`${testID}-quote`}>
        {part.text}
      </Text>
    ) : (
      part.text
    ),
  );
  const body = hasChain
    ? [
        <Text key="chain" style={{ color: theme.colors.brand }} testID={`${testID}-chain`}>
          {text.slice(0, chainEnd)}
        </Text>,
        ...quoted,
      ]
    : quoted.length === 1 && typeof quoted[0] === 'string'
      ? text
      : quoted;

  if (isReader) {
    return (
      <UiText
        accessibilityLanguage="ar"
        style={[displayText('dhikr', fontScale), HADITH_FONT, TEXT_DIRECTION]}
        testID={testID}
        variant="dhikr"
      >
        {body}
      </UiText>
    );
  }

  return (
    <UiText
      accessibilityLanguage="ar"
      numberOfLines={numberOfLines ?? PREVIEW_LINES}
      style={[{ fontSize: HADITH_PREVIEW_FONT_SIZE, lineHeight: HADITH_PREVIEW_LINE_HEIGHT }, HADITH_FONT, TEXT_DIRECTION]}
      testID={testID}
      variant="dhikrList"
    >
      {body}
    </UiText>
  );
}
