import { ayahShareText, textDirection } from './panel-text';

const AYAH_1_2 = 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ';

describe('ayahShareText', () => {
  it('keeps the ayah bytes and appends the marker and reference', () => {
    const text = ayahShareText(AYAH_1_2, 2, 'الفاتحة · الآية ٢');

    expect(text).toBe(`${AYAH_1_2} ﴿٢﴾\nالفاتحة · الآية ٢`);
    const encoder = new TextEncoder();
    expect([...encoder.encode(text.slice(0, AYAH_1_2.length))]).toEqual([...encoder.encode(AYAH_1_2)]);
  });

  it('does not trim or normalize surrounding whitespace in the stored text', () => {
    expect(ayahShareText(` ${AYAH_1_2}\u00A0`, 12, 'ref').startsWith(` ${AYAH_1_2}\u00A0 ﴿١٢﴾`)).toBe(true);
  });
});

describe('textDirection', () => {
  it('follows the first strong character', () => {
    expect(textDirection('  ملاحظة about', 'ltr')).toBe('rtl');
    expect(textDirection('A note عن الآية', 'rtl')).toBe('ltr');
  });

  it('falls back when there is no strong character', () => {
    expect(textDirection('123 …', 'rtl')).toBe('rtl');
    expect(textDirection('', 'ltr')).toBe('ltr');
  });
});
