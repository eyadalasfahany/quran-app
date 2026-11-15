import { storage, storageKeys } from '@/core/storage/mmkv';

import { initialSeerahView, readSeerahView, writeSeerahView } from './view-pref';

describe('seerah view preference', () => {
  beforeEach(() => {
    storage.remove(storageKeys.seerah.view);
  });

  it('remembers the choice', () => {
    expect(readSeerahView()).toBeNull();
    writeSeerahView('list');
    expect(readSeerahView()).toBe('list');
    writeSeerahView('map');
    expect(readSeerahView()).toBe('map');
  });

  it('ignores a stored value that is not a view', () => {
    storage.set(storageKeys.seerah.view, 'grid');
    expect(readSeerahView()).toBeNull();
  });

  it('opens the map by default and suggests the list with a screen reader', () => {
    expect(initialSeerahView({ param: null, stored: null, screenReader: false })).toBe('map');
    expect(initialSeerahView({ param: null, stored: null, screenReader: true })).toBe('list');
  });

  it('never overrides a choice or a route parameter', () => {
    expect(initialSeerahView({ param: null, stored: 'map', screenReader: true })).toBe('map');
    expect(initialSeerahView({ param: 'list', stored: 'map', screenReader: false })).toBe('list');
    expect(initialSeerahView({ param: 'map', stored: 'list', screenReader: true })).toBe('map');
  });
});
