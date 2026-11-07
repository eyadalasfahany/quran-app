import { formatHadithNumber, formatPackSizeMb } from './format';

describe('format', () => {
  it('formatHadithNumber turns 2787.2 into ٢٧٨٧٫٢ in Arabic', () => {
    expect(formatHadithNumber('2787.2', 'ar')).toBe('٢٧٨٧٫٢');
  });

  it('formatHadithNumber leaves letters and keeps them in place (12a)', () => {
    expect(formatHadithNumber('12a', 'ar')).toBe('١٢a');
  });

  it('formatHadithNumber returns the string unchanged in English', () => {
    expect(formatHadithNumber('2787.2', 'en')).toBe('2787.2');
  });

  it('formatHadithNumber returns an empty string for an empty string', () => {
    expect(formatHadithNumber('', 'ar')).toBe('');
  });

  it('formatPackSizeMb rounds 10276044 bytes to 9.8', () => {
    expect(formatPackSizeMb(10276044, 'en')).toBe('9.8');
  });

  it('formatPackSizeMb shows 0.1 for a tiny positive size', () => {
    expect(formatPackSizeMb(1, 'en')).toBe('0.1');
  });

  it('formatPackSizeMb uses Arabic digits and ٫ in Arabic', () => {
    expect(formatPackSizeMb(10276044, 'ar')).toBe('٩٫٨');
  });
});
