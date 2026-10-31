import { storage, storageKeys } from '@/core/storage/mmkv';

import {
  addAzkarRecentSearch,
  AZKAR_RECENT_SEARCHES_MAX,
  clearAzkarRecentSearches,
  readAzkarRecentSearches,
  removeAzkarRecentSearch,
} from './recent-searches';

describe('azkar recent searches', () => {
  beforeEach(() => {
    storage.remove(storageKeys.azkar.searchRecent);
  });

  it('keeps the newest query first, without repeats or blanks', () => {
    addAzkarRecentSearch('الصباح');
    addAzkarRecentSearch('المساء');
    expect(addAzkarRecentSearch('  الصباح  ')).toEqual(['الصباح', 'المساء']);
    expect(addAzkarRecentSearch('   ')).toEqual(['الصباح', 'المساء']);
  });

  it('caps the history', () => {
    for (let index = 0; index < AZKAR_RECENT_SEARCHES_MAX + 3; index += 1) {
      addAzkarRecentSearch(`query ${index}`);
    }
    expect(readAzkarRecentSearches()).toHaveLength(AZKAR_RECENT_SEARCHES_MAX);
  });

  it('removes one query and clears all', () => {
    addAzkarRecentSearch('one');
    addAzkarRecentSearch('two');
    expect(removeAzkarRecentSearch('one')).toEqual(['two']);
    expect(clearAzkarRecentSearches()).toEqual([]);
    expect(readAzkarRecentSearches()).toEqual([]);
  });

  it('ignores a corrupt stored value', () => {
    storage.set(storageKeys.azkar.searchRecent, '{not json');
    expect(readAzkarRecentSearches()).toEqual([]);
  });
});
