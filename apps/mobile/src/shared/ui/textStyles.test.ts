import { bundledFonts } from '@/core/theme';

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

  it('scales Quran text and its line height with the reader setting', () => {
    expect(quranText('quranReading')).toEqual({
      direction: 'ltr',
      fontFamily: 'AmiriQuran',
      fontSize: 28,
      lineHeight: 62,
      textAlign: 'right',
      writingDirection: 'rtl',
    });
    const small = quranText('quranReading', 0.8);
    expect(small.fontSize).toBeCloseTo(22.4);
    expect(small.lineHeight).toBe(49);
    expect(Object.keys(bundledFonts)).toContain(quranText('quranWord').fontFamily);
  });

  it('ties interface text to its Dynamic Type style with a growth cap', () => {
    expect(uiTextProps('body')).toEqual({ dynamicTypeRamp: 'body', maxFontSizeMultiplier: maxFontScale.content });
    expect(uiTextProps('caption', 'bar')).toEqual({
      dynamicTypeRamp: 'footnote',
      maxFontSizeMultiplier: maxFontScale.bar,
    });
  });
});
