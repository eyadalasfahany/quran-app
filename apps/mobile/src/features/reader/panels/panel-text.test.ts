import { i18n } from '@/core/i18n';

import { ayahShareText, tafsirAuthorName, tafsirDisplayName, tafsirRowSubtitle, textDirection } from './panel-text';

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

describe('tafsirDisplayName', () => {
  const both = { name: 'Al-Muyassar', nameAr: 'التفسير الميسر' };

  it('shows the Arabic name in Arabic and the English name in English', () => {
    expect(tafsirDisplayName(both, 'ar', 'تفسير 16')).toBe('التفسير الميسر');
    expect(tafsirDisplayName(both, 'en', 'Tafsir 16')).toBe('Al-Muyassar');
  });

  it('falls back to the other name when the interface one is missing or blank', () => {
    expect(tafsirDisplayName({ name: 'Al-Sa\'di', nameAr: null }, 'ar', 'تفسير 170')).toBe("Al-Sa'di");
    expect(tafsirDisplayName({ name: ' ', nameAr: 'تفسير السعدي' }, 'en', 'Tafsir 170')).toBe('تفسير السعدي');
  });

  it('falls back to the placeholder when both names are null', () => {
    expect(tafsirDisplayName({ name: null, nameAr: null }, 'ar', 'تفسير 16')).toBe('تفسير 16');
    expect(tafsirDisplayName({ name: null, nameAr: null }, 'en', 'Tafsir 16')).toBe('Tafsir 16');
  });
});

describe('tafsirAuthorName', () => {
  const both = { authorAr: 'ابن كثير', authorName: 'Hafiz Ibn Kathir' };

  it('shows the Arabic author in Arabic and the English author in English', () => {
    expect(tafsirAuthorName(both, 'ar')).toBe('ابن كثير');
    expect(tafsirAuthorName(both, 'en')).toBe('Hafiz Ibn Kathir');
  });

  it('falls back to the other author when the interface one is missing or blank', () => {
    expect(tafsirAuthorName({ authorAr: null, authorName: 'Hafiz Ibn Kathir' }, 'ar')).toBe('Hafiz Ibn Kathir');
    expect(tafsirAuthorName({ authorAr: 'ابن كثير', authorName: null }, 'en')).toBe('ابن كثير');
    expect(tafsirAuthorName({ authorAr: ' ', authorName: 'Hafiz Ibn Kathir' }, 'ar')).toBe('Hafiz Ibn Kathir');
    expect(tafsirAuthorName({ authorAr: 'ابن كثير', authorName: ' ' }, 'en')).toBe('ابن كثير');
  });

  it('is null when neither author is set', () => {
    expect(tafsirAuthorName({ authorAr: null, authorName: null }, 'ar')).toBeNull();
    expect(tafsirAuthorName({ authorAr: null, authorName: null }, 'en')).toBeNull();
  });
});

describe('tafsirRowSubtitle', () => {
  it.each([
    ['ar', 'جارٍ التنزيل · ابن كثير · ٤٫٨ م.ب'],
    ['en', 'Downloading · Hafiz Ibn Kathir · 4.8 MB'],
  ] as const)('joins status, author and size in %s', (locale, expected) => {
    const subtitle = tafsirRowSubtitle(
      { author: locale === 'ar' ? 'ابن كثير' : 'Hafiz Ibn Kathir', packSizeBytes: 4_800_000, status: 'downloading' },
      i18n.getFixedT(locale),
      locale,
    );

    expect(subtitle).toBe(expected);
  });

  it.each([
    ['ar', 'تعذّر التنزيل · ابن كثير · ٤٫٨ م.ب'],
    ['en', 'Download failed · Hafiz Ibn Kathir · 4.8 MB'],
  ] as const)('starts a failed download with its failure in %s', (locale, expected) => {
    const subtitle = tafsirRowSubtitle(
      { author: locale === 'ar' ? 'ابن كثير' : 'Hafiz Ibn Kathir', packSizeBytes: 4_800_000, status: 'failed' },
      i18n.getFixedT(locale),
      locale,
    );

    expect(subtitle).toBe(expected);
  });

  it.each([
    ['ar', 'عبد الله بن عبد المحسن التركي · ١٫٢ م.ب'],
    ['en', 'Al-Muyassar author · 1.2 MB'],
  ] as const)('shows no status when idle in %s', (locale, expected) => {
    const subtitle = tafsirRowSubtitle(
      { author: locale === 'ar' ? 'عبد الله بن عبد المحسن التركي' : 'Al-Muyassar author', packSizeBytes: 1_200_000 },
      i18n.getFixedT(locale),
      locale,
    );

    expect(subtitle).toBe(expected);
  });

  it('leaves out the author when there is none', () => {
    expect(tafsirRowSubtitle({ author: null, packSizeBytes: 900_000 }, i18n.getFixedT('ar'), 'ar')).toBe('٠٫٩ م.ب');
    expect(tafsirRowSubtitle({ author: null, packSizeBytes: 900_000 }, i18n.getFixedT('en'), 'en')).toBe('0.9 MB');
  });

  it('leaves out the size when the pack size is 0', () => {
    expect(tafsirRowSubtitle({ author: 'ابن كثير', packSizeBytes: 0 }, i18n.getFixedT('ar'), 'ar')).toBe('ابن كثير');
    expect(tafsirRowSubtitle({ author: null, packSizeBytes: 0, status: 'downloading' }, i18n.getFixedT('en'), 'en')).toBe(
      'Downloading',
    );
  });
});
