import { Text } from 'react-native';

import { useContrastColors } from '@/shared/ui';

import { splitRecitedText } from '../recited-text';

/**
 * An ayah's text as spans, with the recited word marked. Every byte of `text` is drawn, spaces included;
 * the caller's Quran text style applies. Used inside a QuranText (Reading, Focus) or an ayah span (Mushaf).
 *
 * `marking` 'span' (the default, Mushaf) puts the brand wash behind the recited span. 'color' (Reading and Focus,
 * ADR 0039) leaves the background to the pill drawn behind the text, and turns the word's ink to `onBrandSurface`
 * only while `colored` is true.
 */
export function RecitedWords({
  text,
  activeWord,
  testID,
  marking = 'span',
  colored = true,
}: {
  text: string;
  activeWord: number;
  testID?: string;
  marking?: 'span' | 'color';
  colored?: boolean;
}) {
  const colors = useContrastColors();

  const recitedStyle =
    marking === 'span'
      ? { backgroundColor: colors.brandSurface, color: colors.onBrandSurface }
      : colored
        ? { color: colors.onBrandSurface }
        : undefined;

  return (
    <>
      {splitRecitedText(text, activeWord).map((piece, index) =>
        piece.recited ? (
          <Text key={index} style={recitedStyle} testID={testID ? `${testID}-word` : undefined}>
            {piece.text}
          </Text>
        ) : (
          <Text key={index}>{piece.text}</Text>
        ),
      )}
    </>
  );
}
