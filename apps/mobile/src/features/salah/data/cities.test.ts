import { searchCities } from '../data/cities';

describe('searchCities', () => {
  it('should return empty array for empty query', () => {
    expect(searchCities('')).toEqual([]);
  });

  it('should find cities by English name (case-insensitive)', () => {
    const results = searchCities('makkah');
    expect(results.some(city => city.id === 'makkah')).toBe(true);

    const resultsCase = searchCities('MaKkAh');
    expect(resultsCase.some(city => city.id === 'makkah')).toBe(true);
  });

  it('should find cities by Arabic name (normalized)', () => {
    const results = searchCities('مكه');
    expect(results.some(city => city.id === 'makkah')).toBe(true);

    const resultsDiacritics = searchCities('مكّة'); // With tashkeel
    expect(resultsDiacritics.some(city => city.id === 'makkah')).toBe(true);

    const resultsTatweel = searchCities('مــكــة'); // With tatweel
    expect(resultsTatweel.some(city => city.id === 'makkah')).toBe(true);
  });

  it('should return empty array for no match', () => {
    expect(searchCities('NonExistentCity')).toEqual([]);
  });

  it('should limit the number of results', () => {
    const results = searchCities('a', 3); // Query 'a' will match many cities
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('should prioritize matches correctly (basic check)', () => {
    const results = searchCities('cairo');
    expect(results[0]?.id).toBe('cairo');
  });
});
