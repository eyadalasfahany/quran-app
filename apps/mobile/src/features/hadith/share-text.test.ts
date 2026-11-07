import { buildHadithShareText } from './share-text';

const BASE = {
  textAr: 'نص تجريبي ١ — ليس حديثًا',
  collectionTitle: '[اسم المجموعة]',
  bookTitle: '[اسم الكتاب]',
  numberText: '١٢٣٤',
  creditLine: '[سطر المصدر]',
  attribution: null,
};

describe('buildHadithShareText', () => {
  it('starts with the stored text byte for byte', () => {
    expect(buildHadithShareText(BASE).startsWith(BASE.textAr + '\n\n')).toBe(true);
  });

  it('adds the meta line and the credit', () => {
    expect(buildHadithShareText(BASE)).toBe(`${BASE.textAr}\n\n[اسم المجموعة] · [اسم الكتاب] · ١٢٣٤\n[سطر المصدر]`);
  });

  it('adds the attribution line only when given', () => {
    expect(buildHadithShareText({ ...BASE, attribution: '[سطر النسبة]' })).toBe(
      `${BASE.textAr}\n\n[اسم المجموعة] · [اسم الكتاب] · ١٢٣٤\n[سطر المصدر]\n[سطر النسبة]`,
    );
    expect(buildHadithShareText({ ...BASE, attribution: '' })).toBe(buildHadithShareText(BASE));
  });

  it('keeps a text with diacritics and U+200F untouched', () => {
    const text = 'نَصٌّ تَجْرِيبِيٌّ‏ لِلْعَرْضِ فَقَطْ';
    expect(buildHadithShareText({ ...BASE, textAr: text }).startsWith(text + '\n\n')).toBe(true);
  });
});
