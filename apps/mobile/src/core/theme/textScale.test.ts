import { scaleTextStyle, textScaleFor } from '@quran/design-tokens';

describe('textScaleFor (ADR 0043)', () => {
  it.each([
    [{ width: 390, height: 844 }, 1],
    [{ width: 844, height: 390 }, 1],
    [{ width: 375, height: 667 }, 0.96],
    [{ width: 402, height: 874 }, 1.03],
    [{ width: 440, height: 956 }, 1.13],
    [{ width: 1024, height: 1366 }, 1.15],
    [{ width: 320, height: 1024 }, 0.9],
    [{ width: 0, height: 0 }, 1],
  ])('gives the factor for %j', (window, expected) => {
    expect(textScaleFor(window)).toBe(expected);
  });
});

describe('scaleTextStyle (ADR 0043)', () => {
  it('scales size and line height together', () => {
    expect(scaleTextStyle({ size: 17, lineHeight: 26 }, 1.15)).toEqual({ size: 19.6, lineHeight: 30 });
  });
});
