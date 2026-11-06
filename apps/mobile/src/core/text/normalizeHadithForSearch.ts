// TS mirror of apps/api/app/Support/HadithText/HadithSearchTextNormalizer.php (ADR 0042 §8).
// Both read apps/api/tests/Fixtures/hadith/search-normalizer.json; keep the four steps in the same order.

const MAPPED: Readonly<Record<string, string>> = {
  '\u0622': '\u0627',
  '\u0623': '\u0627',
  '\u0625': '\u0627',
  '\u0671': '\u0627',
  '\u0629': '\u0647',
  '\u0649': '\u064A',
};

export function normalizeHadithForSearch(text: string): string {
  // Fresh regexps each call: a shared /g pattern keeps lastIndex between calls.
  const stripped = text.replace(/[\u200B-\u200F\u061C\u202A-\u202E\u2066-\u2069\uFEFF\u0640\u064B-\u065F\u0670\u06D6-\u06ED]/gu, '');
  let mapped = '';

  for (const char of stripped) {
    mapped += MAPPED[char] ?? char;
  }

  return mapped
    .replace(/[\u0009-\u000D\u0020\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+/gu, ' ')
    .replace(/^ | $/gu, '');
}
