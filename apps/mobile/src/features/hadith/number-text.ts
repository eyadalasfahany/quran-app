/**
 * The number label of a hadith. Shows `hadithNumber` unless both range ends are present and differ, then the two ends
 * joined by an en dash (U+2013). Ranges come from merged numbers (step 6b); until the data has them only
 * `hadithNumber` is passed. Never parses the number.
 */
export function hadithNumberText(input: {
  hadithNumber: string;
  numberFirst?: string | null;
  numberLast?: string | null;
}): string {
  const first = input.numberFirst ?? '';
  const last = input.numberLast ?? '';
  if (first !== '' && last !== '' && first !== last) {
    return `${first}–${last}`;
  }
  return input.hadithNumber;
}
