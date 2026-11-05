import { verseRangeLabel } from './verse-range';

describe('verseRangeLabel', () => {
  it('gives the ayah number alone for a single verse', () => {
    expect(verseRangeLabel(7, null, 'en')).toBe('7');
    expect(verseRangeLabel(7, 7, 'en')).toBe('7');
  });

  it('gives from–to for a span, with an en dash', () => {
    expect(verseRangeLabel(255, 256, 'en')).toBe('255–256');
  });

  it('uses the locale digits', () => {
    expect(verseRangeLabel(255, 256, 'ar')).toBe('٢٥٥–٢٥٦');
    expect(verseRangeLabel(7, null, 'ar')).toBe('٧');
  });
});
