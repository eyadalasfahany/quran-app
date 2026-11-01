import { splitRecitedText } from './recited-text';
import {
  clampToWidth,
  pillMove,
  pillRect,
  recitedTokenIndex,
  tokenRects,
  tokensOf,
  type PillLine,
  type TokenRect,
} from './word-pill';

/** FIXTURE text: a placeholder, not Quran. Letters are words; the lone mark (U+06DB) is a waqf token, not a word. */
const WAQF_TEXT = 'أ ب ۛ ج';

function line(overrides: Partial<PillLine> & Pick<PillLine, 'text' | 'x' | 'y' | 'width'>): PillLine {
  return { ascender: 30, descender: -10, height: 40, ...overrides };
}

describe('tokensOf and recitedTokenIndex', () => {
  it('lists every drawn token, waqf marks included, with its char offset', () => {
    const pieces = splitRecitedText(WAQF_TEXT, 3);
    expect(tokensOf(pieces)).toEqual([
      { offset: 0, recited: false, text: 'أ' },
      { offset: 2, recited: false, text: 'ب' },
      { offset: 4, recited: false, text: 'ۛ' },
      { offset: 6, recited: true, text: 'ج' },
    ]);
  });

  it('counts a waqf mark as a token, not a word', () => {
    const pieces = splitRecitedText(WAQF_TEXT, 3);
    expect(recitedTokenIndex(pieces)).toBe(3);
    expect(tokensOf(pieces)[3]).toEqual({ offset: 6, recited: true, text: 'ج' });
  });

  it('gives -1 when the position is past the last word', () => {
    expect(recitedTokenIndex(splitRecitedText(WAQF_TEXT, 9))).toBe(-1);
  });
});

describe('tokenRects', () => {
  // Two lines: line 0 holds 'أ ' and 'ب ' (text length 4), line 1 holds 'ج د' (length 3).
  const TEXT = 'أ ب ج د';
  const tokens = tokensOf(splitRecitedText(TEXT, 1));
  const lines: PillLine[] = [
    line({ text: 'أ ب ', width: 200, x: 10, y: 0 }),
    line({ text: 'ج د', width: 200, x: 10, y: 40 }),
  ];

  it('lays each line out right to left and shares the leftover width over its gaps', () => {
    const rects = tokenRects(tokens, [50, 30, 40, 60], lines);
    // Line 0: leftover 200 − 80 = 120, one gap of 120. The first token's right edge is 10 + 200 = 210.
    // أ: x = 210 − 50 = 160. ب: right edge 210 − (50 + 120) = 40, x = 40 − 30 = 10.
    // Line 1: leftover 200 − 100 = 100, one gap of 100. ج: x = 210 − 40 = 170. د: right edge 70, x = 10.
    expect(rects).toEqual([
      { height: 40, line: 0, width: 50, x: 160, y: 0 },
      { height: 40, line: 0, width: 30, x: 10, y: 0 },
      { height: 40, line: 1, width: 40, x: 170, y: 40 },
      { height: 40, line: 1, width: 60, x: 10, y: 40 },
    ]);
  });

  it('gives a one-token line no gap, so the token sits at its right edge', () => {
    const single = tokenRects(
      tokensOf(splitRecitedText('أ ب', 1)),
      [50, 30],
      [line({ text: 'أ ', width: 100, x: 0, y: 0 }), line({ text: 'ب', width: 100, x: 0, y: 40 })],
    );
    expect(single).toEqual([
      { height: 40, line: 0, width: 50, x: 50, y: 0 },
      { height: 40, line: 1, width: 30, x: 70, y: 40 },
    ]);
  });

  it('gives a waqf mark its own box within the line', () => {
    const oneLine = tokenRects(
      tokensOf(splitRecitedText(WAQF_TEXT, 1)),
      [100, 100, 100, 100],
      [line({ text: WAQF_TEXT, width: 400, x: 0, y: 0 })],
    );
    // Leftover 0, so the four tokens fill the line from the right: the waqf mark (index 2) has its right edge at 200.
    expect(oneLine[2]).toEqual({ height: 40, line: 0, width: 100, x: 100, y: 0 });
  });

  it('gives null when the offset falls on no line', () => {
    const short = tokenRects(tokens, [50, 30, 40, 60], [line({ text: 'أ ب ', width: 200, x: 10, y: 0 })]);
    expect(short[0]).not.toBeNull();
    expect(short[2]).toBeNull();
    expect(short[3]).toBeNull();
  });

  it('gives null for a token whose width is missing, and for the others on its line', () => {
    const rects = tokenRects(tokens, [50, undefined, 40, 60], lines);
    expect(rects[1]).toBeNull();
    expect(rects[0]).toBeNull();
    expect(rects[2]).not.toBeNull();
    expect(rects[3]).not.toBeNull();
  });
});

describe('clampToWidth', () => {
  it('trims padding that runs past either edge of the text box', () => {
    expect(clampToWidth({ height: 30, width: 58, x: -4, y: 10 }, 300)).toEqual({ height: 30, width: 54, x: 0, y: 10 });
    expect(clampToWidth({ height: 30, width: 58, x: 246, y: 10 }, 300)).toEqual({ height: 30, width: 54, x: 246, y: 10 });
  });

  it('leaves a pill inside the box, or an unmeasured box, alone', () => {
    const rect = { height: 30, width: 58, x: 100, y: 10 };
    expect(clampToWidth(rect, 300)).toEqual(rect);
    expect(clampToWidth({ ...rect, x: -4 }, 0)).toEqual({ ...rect, x: -4 });
  });
});

describe('pillRect', () => {
  const lineBox = line({ text: 'x', width: 200, x: 10, y: 40 });
  const token: TokenRect = { height: 40, line: 1, width: 50, x: 160, y: 40 };

  it('pads the token sideways and fits the glyph box around the line centre', () => {
    // Glyph 30 + 10 = 40 tall, so the glyph fills the 40-high line; padV 2 would be 44, clamped to the line's 40.
    expect(pillRect(token, lineBox, 4, 2)).toEqual({ height: 40, width: 58, x: 156, y: 40 });
  });

  it('centres a smaller glyph box in the line and adds padV above and below', () => {
    const small = line({ ascender: 20, descender: -5, height: 40, text: 'x', width: 200, x: 10, y: 40 });
    // Glyph 20 + 5 = 25. Padded height 25 + 4 = 29. Glyph top 40 + (40 − 25) / 2 = 47.5, minus padV 2 = 45.5.
    expect(pillRect(token, small, 4, 2)).toEqual({ height: 29, width: 58, x: 156, y: 45.5 });
  });

  it('uses the absolute value of a negative descender', () => {
    const withAbs = line({ ascender: 20, descender: -5, height: 40, text: 'x', width: 200, x: 10, y: 40 });
    const positive = line({ ascender: 20, descender: 5, height: 40, text: 'x', width: 200, x: 10, y: 40 });
    expect(pillRect(token, withAbs, 4, 2)).toEqual(pillRect(token, positive, 4, 2));
  });

  it('never grows taller than the line and stays inside it', () => {
    const tall = line({ ascender: 50, descender: -20, height: 40, text: 'x', width: 200, x: 10, y: 40 });
    expect(pillRect(token, tall, 4, 2)).toEqual({ height: 40, width: 58, x: 156, y: 40 });
  });
});

describe('pillMove', () => {
  const a: TokenRect = { height: 40, line: 0, width: 50, x: 0, y: 0 };
  const b: TokenRect = { height: 40, line: 0, width: 30, x: 60, y: 0 };
  const c: TokenRect = { height: 40, line: 1, width: 30, x: 60, y: 40 };

  it('slides between two tokens on the same line', () => {
    expect(pillMove(a, b)).toBe('slide');
  });

  it('jumps when the next token is on another line', () => {
    expect(pillMove(b, c)).toBe('jump');
  });

  it('jumps when either side is unknown', () => {
    expect(pillMove(null, b)).toBe('jump');
    expect(pillMove(a, null)).toBe('jump');
    expect(pillMove(null, null)).toBe('jump');
  });
});
