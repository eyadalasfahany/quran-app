import { seerahArtFor } from './seerah-art';

describe('seerahArtFor', () => {
  it.each(['region', 'makkah', 'madinah'])('has art for %s', (level) => {
    expect(seerahArtFor(level, 'light')).toContain('<svg');
  });

  it('uses the dark twin in dark and the light art in light and sepia', () => {
    expect(seerahArtFor('region', 'dark')).not.toBe(seerahArtFor('region', 'light'));
    expect(seerahArtFor('region', 'sepia')).toBe(seerahArtFor('region', 'light'));
  });

  it('is null for an unknown level', () => {
    expect(seerahArtFor('nowhere', 'light')).toBeNull();
  });
});
