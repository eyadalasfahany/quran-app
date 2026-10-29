import { Text } from 'react-native';

import { useContrastColors } from '@/shared/ui';

import { splitRecitedText } from '../recited-text';

/**
 * An ayah's text as spans, with the recited word marked. Every byte of `text` is drawn, spaces included;
 * the caller's Quran text style applies. Used inside a QuranText (Reading, Focus) or an ayah span (Mushaf).
 */
export function RecitedWords({ text, activeWord, testID }: { text: string; activeWord: number; testID?: string }) {
  const colors = useContrastColors();

  return (
    <>
      {splitRecitedText(text, activeWord).map((piece, index) =>
        piece.recited ? (
          <Text
            key={index}
            style={{ backgroundColor: colors.brandSurface, color: colors.onBrandSurface }}
            testID={testID ? `${testID}-word` : undefined}
          >
            {piece.text}
          </Text>
        ) : (
          <Text key={index}>{piece.text}</Text>
        ),
      )}
    </>
  );
}
