import { storage, storageKeys } from '@/core/storage/mmkv';

import { addRecentSearch, clearRecentSearches, readRecentSearches } from './recentSearches';

describe('recent searches', () => {
  beforeEach(() => {
    storage.remove(storageKeys.searchRecentQueries);
  });

  it('clears every recent query and returns an empty list', () => {
    addRecentSearch('الصباح');
    addRecentSearch('المساء');

    expect(clearRecentSearches()).toEqual([]);
    expect(readRecentSearches()).toEqual([]);
    expect(storage.getString(storageKeys.searchRecentQueries)).toBeUndefined();
  });
});
