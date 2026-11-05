import type { ReciterEntry } from './reciter-list';
import { currentReciterFirst, playerReciterRowState } from './player-reciters';

function reciter(resourceId: number): ReciterEntry {
  return {
    hasTimings: false,
    installed: false,
    isDefault: false,
    name: `Reciter ${resourceId}`,
    nameAr: null,
    resourceId,
    style: null,
  };
}

describe('currentReciterFirst', () => {
  it('moves the current reciter to the front and keeps the catalogue order for the rest', () => {
    const list = [reciter(30), reciter(31), reciter(32)];

    expect(currentReciterFirst(list, 31).map((item) => item.resourceId)).toEqual([31, 30, 32]);
  });

  it('keeps the catalogue order when there is no current reciter in the list', () => {
    const list = [reciter(30), reciter(31)];

    expect(currentReciterFirst(list, null).map((item) => item.resourceId)).toEqual([30, 31]);
    expect(currentReciterFirst(list, 99).map((item) => item.resourceId)).toEqual([30, 31]);
  });

  it('does not mutate the list it is given', () => {
    const list = [reciter(30), reciter(31)];

    currentReciterFirst(list, 31);
    expect(list.map((item) => item.resourceId)).toEqual([30, 31]);
  });
});

describe('playerReciterRowState', () => {
  const base = { availability: 'unknown' as const, downloading: false, installed: true, isCurrent: false };

  it('is current for the current reciter, whatever its pack holds', () => {
    expect(playerReciterRowState({ ...base, isCurrent: true, availability: 'unavailable' })).toBe('current');
  });

  it('is unavailable for an installed pack with no file for the surah', () => {
    expect(playerReciterRowState({ ...base, availability: 'unavailable' })).toBe('unavailable');
  });

  it('is never unavailable for a pack that is not installed', () => {
    expect(playerReciterRowState({ ...base, installed: false, availability: 'unavailable' })).toBe('notDownloaded');
  });

  it('is downloading while its pack installs, and not downloaded before that', () => {
    expect(playerReciterRowState({ ...base, installed: false, downloading: true })).toBe('downloading');
    expect(playerReciterRowState({ ...base, installed: false })).toBe('notDownloaded');
  });

  it('is installed for an installed pack that has the surah or whose surahs are unknown', () => {
    expect(playerReciterRowState({ ...base, availability: 'available' })).toBe('installed');
    expect(playerReciterRowState({ ...base, availability: 'unknown' })).toBe('installed');
  });
});
