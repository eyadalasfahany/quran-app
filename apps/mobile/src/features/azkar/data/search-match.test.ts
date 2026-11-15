import { categoryMatchRange, snippetAround } from './search';

// Placeholder words only; the windowing is about positions, not the text.
const WORD = 'ABCDEFGHIJ';
const LONG = Array.from({ length: 40 }, () => WORD).join(' ');

describe('categoryMatchRange', () => {
  it('maps a normalised match back onto the label', () => {
    expect(categoryMatchRange('FIXTURE topic alpha', 'topic')).toEqual({ start: 8, end: 13 });
  });

  it('returns null for no match, an empty query, or a blank one', () => {
    expect(categoryMatchRange('FIXTURE topic alpha', 'beta')).toBeNull();
    expect(categoryMatchRange('FIXTURE topic alpha', '')).toBeNull();
    expect(categoryMatchRange('FIXTURE topic alpha', '   ')).toBeNull();
  });
});

describe('snippetAround', () => {
  it('returns a short text whole, with its highlight unchanged', () => {
    const highlight = { start: 2, end: 5 };
    expect(snippetAround('ab cde', highlight)).toEqual({ text: 'ab cde', highlight });
  });

  it('returns a long text whole when there is no highlight', () => {
    expect(snippetAround(LONG, null)).toEqual({ text: LONG, highlight: null });
  });

  it('cuts a long text to a window that still holds the match, and moves the range with it', () => {
    const start = LONG.indexOf('EFGH', 250);
    const highlight = { start, end: start + 4 };

    const result = snippetAround(LONG, highlight);

    expect(result.text.length).toBeLessThanOrEqual(160);
    expect(result.highlight).not.toBeNull();
    expect(result.text.slice(result.highlight!.start, result.highlight!.end)).toBe('EFGH');
  });

  it('starts a window at a word boundary, so no word is cut at its start', () => {
    const start = LONG.indexOf('EFGH', 200);
    const result = snippetAround(LONG, { start, end: start + 4 });

    expect(result.text.startsWith(WORD)).toBe(true);
  });

  it('keeps the start of a text whose match is near the start', () => {
    const result = snippetAround(LONG, { start: 0, end: 4 });

    expect(result.text.startsWith(WORD)).toBe(true);
    expect(result.highlight).toEqual({ start: 0, end: 4 });
  });

  it('ends a window at the end of the text when the match is near the end', () => {
    const start = LONG.length - 4;
    const result = snippetAround(LONG, { start, end: LONG.length });

    expect(result.text.endsWith(WORD)).toBe(true);
    expect(result.highlight).not.toBeNull();
    expect(result.text.slice(result.highlight!.start, result.highlight!.end)).toBe(LONG.slice(start));
  });
});
