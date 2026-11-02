import { bundledFonts, QURAN_FONTS, quranFonts } from '@/core/theme';

import { displayText, maxFontScale, quranText, uiTextProps } from './textStyles';

describe('text styles', () => {
  it('maps display weights to loaded Amiri faces without fontWeight', () => {
    for (const token of ['displayLg', 'displayMd', 'displaySm', 'numeral'] as const) {
      const style = displayText(token);
      expect(Object.keys(bundledFonts)).toContain(style.fontFamily);
      expect(style.fontWeight).toBeUndefined();
    }
    expect(displayText('displaySm').fontFamily).toBe('Amiri-Bold');
    expect(displayText('numeral').fontFamily).toBe('Amiri-Regular');
  });

  it('sets Quran text in the given family, defaulting to Amiri Quran', () => {
    expect(quranText('quranReading', 1, 'ScheherazadeNew-Regular')).toMatchObject({
      fontFamily: 'ScheherazadeNew-Regular',
      fontSize: 27,
      lineHeight: 57,
    });
    expect(quranText('quranReading').fontFamily).toBe('AmiriQuran');
  });

  it('registers every Quran font as a bundled font', () => {
    for (const font of QURAN_FONTS) {
      expect(Object.keys(bundledFonts)).toContain(quranFonts[font].family);
    }
  });

  it('scales Quran text and its line height with the reader setting', () => {
    expect(quranText('quranReading')).toEqual({
      direction: 'ltr',
      fontFamily: 'AmiriQuran',
      fontSize: 27,
      lineHeight: 57,
      textAlign: 'right',
      writingDirection: 'rtl',
    });
    const small = quranText('quranReading', 0.8);
    expect(small.fontSize).toBeCloseTo(21.6);
    expect(small.lineHeight).toBe(45);
    expect(Object.keys(bundledFonts)).toContain(quranText('quranWord').fontFamily);
    expect(quranText('quranMushaf')).toMatchObject({ fontSize: 25, lineHeight: 59 });
    expect(quranText('quranFocus')).toMatchObject({ fontSize: 38, lineHeight: 80 });
    expect(quranText('quranFocusAside')).toMatchObject({ fontSize: 24, lineHeight: 48 });
  });

  it('ties interface text to its Dynamic Type style with a growth cap', () => {
    expect(uiTextProps('body')).toEqual({ dynamicTypeRamp: 'body', maxFontSizeMultiplier: maxFontScale.content });
    expect(uiTextProps('caption', 'bar')).toEqual({
      dynamicTypeRamp: 'footnote',
      maxFontSizeMultiplier: maxFontScale.bar,
    });
  });
});
