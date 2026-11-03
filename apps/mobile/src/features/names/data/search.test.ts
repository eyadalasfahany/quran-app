import { normalizeNamesQuery } from './search';

describe('normalizeNamesQuery', () => {
  it('strips a leading al and unifies alef forms', () => {
    expect(normalizeNamesQuery('الأ_fixture')).toBe('ا_fixture');
  });
});
