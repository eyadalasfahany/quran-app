import type { HighlightColor } from '@/shared/ui';

import { withSavedWash } from './saved-wash';

describe('withSavedWash', () => {
  it('returns the same map object when there is no saved ayah', () => {
    const highlights = new Map<number, HighlightColor>([[1, 'blue']]);

    expect(withSavedWash(highlights, null)).toBe(highlights);
  });

  it('keeps the saved ayah own colour over the green wash (ADR 0073, decision 5)', () => {
    const highlights = new Map<number, HighlightColor>([[7, 'rose']]);

    expect(withSavedWash(highlights, 7)).toBe(highlights);
    expect(withSavedWash(highlights, 7).get(7)).toBe('rose');
  });

  it('returns the same map object when the saved ayah is already green', () => {
    const highlights = new Map<number, HighlightColor>([[7, 'green']]);

    expect(withSavedWash(highlights, 7)).toBe(highlights);
  });

  it('keeps every other colour when the saved ayah has its own', () => {
    const highlights = new Map<number, HighlightColor>([
      [1, 'blue'],
      [7, 'gold'],
    ]);

    expect(withSavedWash(highlights, 7).get(7)).toBe('gold');
    expect(withSavedWash(highlights, 7).get(1)).toBe('blue');
  });

  it('adds green for the saved ayah when it has no colour', () => {
    const highlights = new Map<number, HighlightColor>([[1, 'blue']]);

    const drawn = withSavedWash(highlights, 7);

    expect(drawn.get(7)).toBe('green');
    expect(drawn.get(1)).toBe('blue');
    expect(drawn.size).toBe(2);
  });

  it('does not mutate the input map', () => {
    const highlights = new Map<number, HighlightColor>([[1, 'blue'], [7, 'rose']]);

    withSavedWash(highlights, 7);

    expect(highlights.get(7)).toBe('rose');
    expect(highlights.has(7)).toBe(true);
    expect(highlights.size).toBe(2);
  });
});
