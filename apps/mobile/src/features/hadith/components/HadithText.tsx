import { Text } from 'react-native';

import { useTheme } from '@/core/theme';
import { displayText, UiText } from '@/shared/ui';

// Frames HadithCollBook, HadithCollSaved and HadithCollSearchResults draw previews at 19 over 36 (1.89x).
// The typeScale token dhikrList is 19 over 34 (1.79x), below the 1.8x rule, so the preview uses this constant.
const HADITH_PREVIEW_LINE_HEIGHT = 36;
const HADITH_PREVIEW_FONT_SIZE = 19;
// Reader text is 28 over 56 (frame HadithCollReader), larger than the shared dhikr token (24 over 48), which Azkar keeps.
const HADITH_READER_FONT_SIZE = 28;
const HADITH_READER_LINE_HEIGHT = 56;
const PREVIEW_LINES = 3;

// Hadith text is justified RTL in both UI languages (ADR 0042 section 6). Not centred, never arabicTextDirection.
const TEXT_DIRECTION = { textAlign: 'justify', writingDirection: 'rtl' } as const;

/**
 * The one place hadith text is drawn. The string is rendered as given: nothing is trimmed, normalised or
 * truncated here. `chainEnd` splits off the narrator chain, but only for a valid offset inside the text.
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

  const body = hasChain
    ? [
        <Text key="chain" style={{ color: theme.colors.brand }} testID={`${testID}-chain`}>
          {text.slice(0, chainEnd)}
        </Text>,
        text.slice(chainEnd),
      ]
    : text;

  if (isReader) {
    return (
      <UiText
        accessibilityLanguage="ar"
        style={[
          displayText('dhikr', fontScale),
          { fontSize: HADITH_READER_FONT_SIZE * fontScale, lineHeight: HADITH_READER_LINE_HEIGHT * fontScale },
          TEXT_DIRECTION,
        ]}
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
      style={[{ fontSize: HADITH_PREVIEW_FONT_SIZE, lineHeight: HADITH_PREVIEW_LINE_HEIGHT }, TEXT_DIRECTION]}
      testID={testID}
      variant="dhikrList"
    >
      {body}
    </UiText>
  );
}
