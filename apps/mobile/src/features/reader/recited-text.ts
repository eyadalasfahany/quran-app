// Splits an ayah's text into spans for the recited-word highlight. Pure, and keeps every byte.

export type TextPiece = { text: string; separator: boolean; recited: boolean };

// Splits an ayah at its single spaces and marks the recited word. `activeWord` is 1-based among the words
// (non-empty tokens), as the engine reports it. Joining the pieces gives back the text exactly: the spaces are
// kept, and nothing is trimmed or re-encoded.
export function splitRecitedText(text: string, activeWord: number): TextPiece[] {
  const pieces: TextPiece[] = [];
  let wordIndex = 0;
  text.split(' ').forEach((token, index) => {
    if (index > 0) {
      pieces.push({ recited: false, separator: true, text: ' ' });
    }
    if (token.length === 0) {
      return;
    }
    // Tanzil sets some waqf marks (2:2 «رَيْبَ ۛ فِيهِ») and ۞ as their own tokens; QF's word positions count
    // only words, so a token without a letter is drawn but not counted.
    if (!/\p{L}/u.test(token)) {
      pieces.push({ recited: false, separator: false, text: token });
      return;
    }
    wordIndex += 1;
    pieces.push({ recited: wordIndex === activeWord, separator: false, text: token });
  });
  return pieces;
}

// Draws an ayah's Quran text with its recited word on the brand surface. Null, or an ayah without segments,
// draws the text whole.
