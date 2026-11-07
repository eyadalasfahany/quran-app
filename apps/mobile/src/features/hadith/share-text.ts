/**
 * The text shared from the reader. The first segment is the stored hadith text, byte for byte; the meta line and the
 * credit follow it. The attribution line is added only when the source gives one.
 */
export function buildHadithShareText(input: {
  textAr: string;
  collectionTitle: string;
  bookTitle: string;
  numberText: string;
  creditLine: string;
  attribution: string | null;
}): string {
  const meta = `${input.collectionTitle} · ${input.bookTitle} · ${input.numberText}`;
  const base = `${input.textAr}\n\n${meta}\n${input.creditLine}`;
  return input.attribution !== null && input.attribution !== '' ? `${base}\n${input.attribution}` : base;
}
