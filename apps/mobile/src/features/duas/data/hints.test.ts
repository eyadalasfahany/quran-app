import { parseDuaHints } from './hints';

const FIXTURE_1 = 'FIXTURE hint 1 — not a dua';
const FIXTURE_2 = 'FIXTURE hint 2 — not a dua';

describe('parseDuaHints', () => {
  it('returns the string elements of a JSON array, unchanged', () => {
    expect(parseDuaHints(JSON.stringify([FIXTURE_1, FIXTURE_2]))).toEqual([FIXTURE_1, FIXTURE_2]);
  });

  it('keeps each element byte-for-byte, including surrounding spaces', () => {
    expect(parseDuaHints(JSON.stringify([`  ${FIXTURE_1} `]))).toEqual([`  ${FIXTURE_1} `]);
  });

  it('drops non-string elements of an array', () => {
    expect(parseDuaHints(JSON.stringify([FIXTURE_1, 2, null, FIXTURE_2]))).toEqual([FIXTURE_1, FIXTURE_2]);
  });

  it('returns an empty list for null', () => {
    expect(parseDuaHints(null)).toEqual([]);
  });

  it('returns an empty list for a blank value', () => {
    expect(parseDuaHints('')).toEqual([]);
    expect(parseDuaHints('   ')).toEqual([]);
  });

  it('returns an empty list for an empty array', () => {
    expect(parseDuaHints('[]')).toEqual([]);
  });

  it('keeps invalid JSON as one hint, unparsed', () => {
    expect(parseDuaHints(FIXTURE_1)).toEqual([FIXTURE_1]);
    expect(parseDuaHints('[FIXTURE broken')).toEqual(['[FIXTURE broken']);
  });

  it('keeps a JSON value that is not an array as one hint, unparsed', () => {
    const raw = JSON.stringify({ text: FIXTURE_1 });
    expect(parseDuaHints(raw)).toEqual([raw]);
  });
});
