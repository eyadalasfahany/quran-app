import { storage, storageKeys } from '@/core/storage/mmkv';

import { parseReciterId, readSavedReciterId, resolveReciterId, writeSavedReciterId, type ReciterOption } from './settings-model';

const reciters: ReciterOption[] = [
  { installed: false, resourceId: 30 },
  { installed: true, resourceId: 31 },
  { installed: true, resourceId: 32 },
];

describe('resolveReciterId', () => {
  it('returns the saved reciter when it is listed, installed or not', () => {
    expect(resolveReciterId(30, reciters, 31)).toBe(30);
  });

  it('falls back to the default when the saved reciter is not listed', () => {
    expect(resolveReciterId(99, reciters, 32)).toBe(32);
  });

  it('falls back to the default when nothing is saved', () => {
    expect(resolveReciterId(null, reciters, 32)).toBe(32);
  });

  it('ignores a default that is not listed and takes the first installed reciter', () => {
    expect(resolveReciterId(null, reciters, 99)).toBe(31);
    expect(resolveReciterId(99, reciters, null)).toBe(31);
  });

  it('takes the first reciter when none is installed', () => {
    const none: ReciterOption[] = [
      { installed: false, resourceId: 40 },
      { installed: false, resourceId: 41 },
    ];
    expect(resolveReciterId(null, none, null)).toBe(40);
  });

  it('returns null when there are no reciters', () => {
    expect(resolveReciterId(30, [], 30)).toBeNull();
  });
});

describe('reciter id storage', () => {
  beforeEach(() => {
    storage.remove(storageKeys.audioReciterId);
  });

  it('round-trips a saved id through MMKV', () => {
    expect(readSavedReciterId()).toBeNull();
    writeSavedReciterId(30);
    expect(readSavedReciterId()).toBe(30);
  });

  it('treats a corrupt stored value as nothing saved', () => {
    storage.set(storageKeys.audioReciterId, 'abc');
    expect(readSavedReciterId()).toBeNull();
  });

  it('parses only positive integers', () => {
    expect(parseReciterId(undefined)).toBeNull();
    expect(parseReciterId('')).toBeNull();
    expect(parseReciterId('0')).toBeNull();
    expect(parseReciterId('-3')).toBeNull();
    expect(parseReciterId('1.5')).toBeNull();
    expect(parseReciterId('30')).toBe(30);
  });
});
