import { chapterDisplayName } from './chapters';

// Fixture names are placeholders for the shape only; they are not Quran text.
const chapter = { nameArabic: 'اسم عربي تجريبي', nameSimple: 'Test-Simple', nameEn: 'Test English' };

describe('chapterDisplayName', () => {
  it('shows the Arabic name in Arabic', () => {
    expect(chapterDisplayName(chapter, 'ar')).toBe('اسم عربي تجريبي');
  });

  it('shows the transliteration in English, never the English meaning', () => {
    expect(chapterDisplayName(chapter, 'en')).toBe('Test-Simple');
    expect(chapterDisplayName(chapter, 'en')).not.toBe(chapter.nameEn);
  });
});
