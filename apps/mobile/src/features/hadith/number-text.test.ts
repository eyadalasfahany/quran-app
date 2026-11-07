import { formatHadithNumber } from './format';
import { hadithNumberText } from './number-text';

describe('hadithNumberText', () => {
  it('returns the number when there is no range', () => {
    expect(hadithNumberText({ hadithNumber: '1234' })).toBe('1234');
    expect(hadithNumberText({ hadithNumber: '1234', numberFirst: null, numberLast: null })).toBe('1234');
  });

  it('joins a range with an en dash', () => {
    expect(hadithNumberText({ hadithNumber: '5709', numberFirst: '5709', numberLast: '5712' })).toBe('5709–5712');
    expect(hadithNumberText({ hadithNumber: '5709', numberFirst: '5709', numberLast: '5712' }).charCodeAt(4)).toBe(0x2013);
  });

  it('ignores a range whose ends are equal', () => {
    expect(hadithNumberText({ hadithNumber: '5709', numberFirst: '5709', numberLast: '5709' })).toBe('5709');
  });

  it('ignores a half range', () => {
    expect(hadithNumberText({ hadithNumber: '5709', numberFirst: '5709', numberLast: null })).toBe('5709');
    expect(hadithNumberText({ hadithNumber: '5709', numberFirst: '', numberLast: '5712' })).toBe('5709');
  });

  it('does not parse decimals (3.1 stays 3.1)', () => {
    expect(hadithNumberText({ hadithNumber: '3.1' })).toBe('3.1');
  });

  it('works with formatHadithNumber to give ٥٧٠٩–٥٧١٢ in Arabic', () => {
    const text = hadithNumberText({ hadithNumber: '5709', numberFirst: '5709', numberLast: '5712' });
    expect(formatHadithNumber(text, 'ar')).toBe('٥٧٠٩–٥٧١٢');
  });
});
