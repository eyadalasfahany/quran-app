const MAPPED: Record<string, string> = {
  '\u0622': '\u0627',
  '\u0623': '\u0627',
  '\u0625': '\u0627',
  '\u0629': '\u0647',
  '\u0649': '\u064A',
  '\u0671': '\u0627',
};

export function normalizeForSearch(text: string): string {
  // A fresh regexp each call: a shared /g pattern keeps lastIndex between calls.
  const stripped = text.replace(/[\u0640\u064B-\u065F\u0670\u06D6-\u06ED]/gu, '');
  let mapped = '';

  for (const char of stripped) {
    mapped += MAPPED[char] ?? char;
  }

  return mapped.replace(/\s+/gu, ' ').trim();
}
