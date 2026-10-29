import { ayahEndMarkText } from '@/shared/ui/AyahEndMark';

import { splitRecitedText } from './recited-text';
import {
  comfortBand,
  FOLLOW_VIEW_POSITION,
  lineForOffset,
  recitedWordOffset,
  scrollTargetForLine,
  wordCharOffset,
} from './word-follow';

// A waqf mark is its own token (no letter): drawn, never counted, as in Tanzil's 2:2.
const TEXT = 'ذَٰلِكَ ٱلْكِتَٰبُ ۛ لَا رَيْبَ فِيهِ';

describe('wordCharOffset', () => {
  it('is zero for the first word', () => {
    expect(wordCharOffset(splitRecitedText(TEXT, 1), 1)).toBe(0);
  });

  it('counts the spaces before the word', () => {
    const second = TEXT.indexOf('ٱلْكِتَٰبُ');
    expect(wordCharOffset(splitRecitedText(TEXT, 2), 2)).toBe(second);
  });

  it('skips a waqf mark before the word without counting it', () => {
    // The mark is between words 2 and 3: word 3 starts after it, at the offset of «لَا».
    const third = TEXT.indexOf('لَا');
    expect(wordCharOffset(splitRecitedText(TEXT, 3), 3)).toBe(third);
    expect(TEXT.slice(third).startsWith('لَا')).toBe(true);
  });

  it('is null when the ayah has fewer words than asked for', () => {
    expect(wordCharOffset(splitRecitedText(TEXT, 9), 9)).toBeNull();
  });
});

describe('recitedWordOffset', () => {
  it('points at the start of the counted word in the text, for every word', () => {
    const words = TEXT.split(' ').filter((token) => /\p{L}/u.test(token));
    words.forEach((word, index) => {
      const offset = recitedWordOffset(TEXT, index + 1);
      expect(offset).not.toBeNull();
      expect(TEXT.slice(offset!).startsWith(word)).toBe(true);
    });
  });
});

describe('lineForOffset', () => {
  const lines = [
    { height: 40, text: 'abcd ', y: 0 },
    { height: 40, text: 'efgh ', y: 40 },
    { height: 40, text: 'ij', y: 80 },
  ];

  it('finds the first line from offset zero', () => {
    expect(lineForOffset(lines, 0)).toBe(0);
  });

  it('gives a break offset to the line after it', () => {
    expect(lineForOffset(lines, 5)).toBe(1);
  });

  it('finds the last character on the last line', () => {
    // The lines hold 5 + 5 + 2 = 12 characters; index 9 is the space that ends the second line.
    expect(lineForOffset(lines, 9)).toBe(1);
    expect(lineForOffset(lines, 10)).toBe(2);
    expect(lineForOffset(lines, 11)).toBe(2);
  });

  it('is -1 past the end, below zero, or with no lines', () => {
    expect(lineForOffset(lines, 12)).toBe(-1);
    expect(lineForOffset(lines, -1)).toBe(-1);
    expect(lineForOffset([], 0)).toBe(-1);
  });

  it('skips an empty line', () => {
    expect(
      lineForOffset(
        [
          { height: 40, text: 'ab', y: 0 },
          { height: 40, text: '', y: 40 },
          { height: 40, text: 'cd', y: 40 },
        ],
        2,
      ),
    ).toBe(2);
  });
});

describe('comfortBand', () => {
  it('is the middle 60% of the visible area', () => {
    expect(comfortBand(1000)).toEqual({ bottom: 800, top: 200 });
  });
});

describe('scrollTargetForLine', () => {
  const viewport = { height: 900 };
  const band = comfortBand(900); // 180 to 720

  it('is null for a line wholly inside the band', () => {
    expect(scrollTargetForLine(300, 40, viewport, band)).toBeNull();
  });

  it('is null for a line exactly on the band edges', () => {
    expect(scrollTargetForLine(180, 40, viewport, band)).toBeNull();
    expect(scrollTargetForLine(680, 40, viewport, band)).toBeNull();
  });

  it('scrolls a line below the band so it sits a third down the viewport', () => {
    const lineY = 760;
    expect(scrollTargetForLine(lineY, 40, viewport, band)).toBe(lineY - 900 * FOLLOW_VIEW_POSITION);
  });

  it('scrolls a line above the band back, with a negative change', () => {
    expect(scrollTargetForLine(100, 40, viewport, band)).toBe(100 - 300);
  });

  it('scrolls a line that straddles the bottom edge, since the whole line must fit', () => {
    expect(scrollTargetForLine(700, 40, viewport, band)).not.toBeNull();
  });

  it('scrolls a line that is taller than the band, since it can never fit', () => {
    expect(scrollTargetForLine(300, 600, viewport, band)).not.toBeNull();
  });
});

describe('the end-mark text the offsets count', () => {
  it('is the direction mark, the ornate brackets and the Arabic-Indic digits', () => {
    expect(ayahEndMarkText(7)).toBe(`‏﴿${'٧'}﴾`);
  });
});
