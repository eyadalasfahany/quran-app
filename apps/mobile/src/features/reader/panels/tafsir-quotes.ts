// QF tafsir passages mark quoted Quran textually, not with markup: {…} around fragments and ﴿…﴾ around
// citations. The server sanitizer strips every attribute, so the app wraps those spans itself to colour
// them. Presentation only: the characters, including the delimiters, stay exactly as received.
export const QURAN_QUOTE_CLASS = 'quran-quote';

const QUOTE_SPAN = /(\{[^{}]+\}|﴿[^﴿﴾]+﴾)/g;

export function wrapQuranQuotes(html: string): string {
  // The sanitized passage has no attributes left, so {…} and ﴿…﴾ can only appear in text, never in a tag.
  return html.replace(QUOTE_SPAN, `<span class="${QURAN_QUOTE_CLASS}">$1</span>`);
}
