import { storage, storageKeys } from '@/core/storage/mmkv';

import { parseLastPosition, readLastPosition, writeLastPosition } from './resume-model';

beforeEach(() => {
  storage.remove(storageKeys.audioLastPosition);
});

describe('parseLastPosition', () => {
  it('parses a saved position', () => {
    expect(parseLastPosition('{"reciterId":30,"chapterId":2,"positionMs":5000}')).toEqual({
      reciterId: 30,
      chapterId: 2,
      positionMs: 5000,
    });
  });

  it('keeps a null reciter', () => {
    expect(parseLastPosition('{"reciterId":null,"chapterId":1,"positionMs":0}')).toEqual({
      reciterId: null,
      chapterId: 1,
      positionMs: 0,
    });
  });

  it.each([
    ['nothing stored', undefined],
    ['malformed JSON', '{not json'],
    ['a JSON string', '"audio"'],
    ['null', 'null'],
    ['a missing reciter', '{"chapterId":1,"positionMs":0}'],
    ['a zero reciter', '{"reciterId":0,"chapterId":1,"positionMs":0}'],
    ['a string reciter', '{"reciterId":"30","chapterId":1,"positionMs":0}'],
    ['surah 0', '{"reciterId":30,"chapterId":0,"positionMs":0}'],
    ['surah 115', '{"reciterId":30,"chapterId":115,"positionMs":0}'],
    ['a fractional position', '{"reciterId":30,"chapterId":1,"positionMs":1.5}'],
    ['a negative position', '{"reciterId":30,"chapterId":1,"positionMs":-1}'],
  ])('ignores %s', (_label: string, raw: string | undefined) => {
    expect(parseLastPosition(raw)).toBeNull();
  });
});

describe('last position storage', () => {
  it('round-trips through MMKV', () => {
    writeLastPosition({ reciterId: 31, chapterId: 114, positionMs: 1200 });
    expect(readLastPosition()).toEqual({ reciterId: 31, chapterId: 114, positionMs: 1200 });
  });

  it('ignores a corrupt stored value', () => {
    storage.set(storageKeys.audioLastPosition, '{broken');
    expect(readLastPosition()).toBeNull();
  });
});
