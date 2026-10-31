import { distanceToMakkah, formatKilometers } from './distance';

describe('distanceToMakkah', () => {
  it('calculates 0 km for Makkah itself', () => {
    expect(distanceToMakkah({ lat: 21.4225, lng: 39.8262 })).toBe(0);
  });

  it('calculates approximately 111 km for one degree of latitude north of Makkah', () => {
    expect(distanceToMakkah({ lat: 22.4225, lng: 39.8262 })).toBe(111);
  });

  it('calculates the distance for London', () => {
    expect(distanceToMakkah({ lat: 51.5074, lng: 0.1278 })).toBe(4778);
  });

  it('calculates the distance for Tokyo', () => {
    expect(distanceToMakkah({ lat: 35.6762, lng: 139.6503 })).toBe(9472);
  });
});

describe('formatKilometers', () => {
  it('groups thousands with a comma for English', () => {
    expect(formatKilometers(12345, 'en')).toBe('12,345');
    expect(formatKilometers(1245, 'en')).toBe('1,245');
    expect(formatKilometers(123, 'en')).toBe('123');
    expect(formatKilometers(0, 'en')).toBe('0');
  });

  it('groups thousands with U+066C and Arabic-Indic digits for Arabic', () => {
    expect(formatKilometers(1245, 'ar')).toBe('١٬٢٤٥');
    expect(formatKilometers(12345, 'ar')).toBe('١٢٬٣٤٥');
    expect(formatKilometers(1234567, 'ar')).toBe('١٬٢٣٤٬٥٦٧');
    expect(formatKilometers(123, 'ar')).toBe('١٢٣');
    expect(formatKilometers(0, 'ar')).toBe('٠');
  });
});
