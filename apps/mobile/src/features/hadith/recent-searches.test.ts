import { storage, storageKeys } from '@/core/storage/mmkv';

import {
  addHadithRecentSearch,
  clearHadithRecentSearches,
  HADITH_RECENT_SEARCHES_MAX,
  readHadithRecentSearches,
  removeHadithRecentSearch,
} from './recent-searches';
import { addRecentSearch, readRecentSearches } from '../search/recentSearches';
import { addAzkarRecentSearch, readAzkarRecentSearches } from '../azkar/data/recent-searches';

describe('hadith recent searches', () => {
  beforeEach(() => {
    storage.remove(storageKeys.hadith.searchRecent);
    storage.remove(storageKeys.searchRecentQueries);
    storage.remove(storageKeys.azkar.searchRecent);
  });

  it('reads an empty list when nothing is stored', () => {
    expect(readHadithRecentSearches()).toEqual([]);
  });

  it('adds a trimmed query at the front', () => {
    addHadithRecentSearch('  FIXTURE one  ');
    expect(addHadithRecentSearch('FIXTURE two')).toEqual(['FIXTURE two', 'FIXTURE one']);
  });

  it('moves a repeated query to the front without duplicating it', () => {
    addHadithRecentSearch('FIXTURE one');
    addHadithRecentSearch('FIXTURE two');
    expect(addHadithRecentSearch('FIXTURE one')).toEqual(['FIXTURE one', 'FIXTURE two']);
  });

  it('ignores an empty or whitespace query', () => {
    addHadithRecentSearch('FIXTURE one');
    expect(addHadithRecentSearch('   ')).toEqual(['FIXTURE one']);
    expect(addHadithRecentSearch('')).toEqual(['FIXTURE one']);
  });

  it('caps the list at 20 and drops the oldest', () => {
    expect(HADITH_RECENT_SEARCHES_MAX).toBe(20);
    for (let index = 1; index <= 21; index += 1) {
      addHadithRecentSearch(`FIXTURE ${index}`);
    }
    const list = readHadithRecentSearches();
    expect(list).toHaveLength(20);
    expect(list[0]).toBe('FIXTURE 21');
    expect(list).not.toContain('FIXTURE 1');
  });

  it('removes one query', () => {
    addHadithRecentSearch('FIXTURE one');
    addHadithRecentSearch('FIXTURE two');
    expect(removeHadithRecentSearch('FIXTURE one')).toEqual(['FIXTURE two']);
  });

  it('clear removes the key and returns an empty list', () => {
    addHadithRecentSearch('FIXTURE one');
    expect(clearHadithRecentSearches()).toEqual([]);
    expect(readHadithRecentSearches()).toEqual([]);
    expect(storage.contains(storageKeys.hadith.searchRecent)).toBe(false);
  });

  it('tolerates invalid stored JSON', () => {
    storage.set(storageKeys.hadith.searchRecent, '{not json');
    expect(readHadithRecentSearches()).toEqual([]);
    storage.set(storageKeys.hadith.searchRecent, JSON.stringify({ query: 'FIXTURE' }));
    expect(readHadithRecentSearches()).toEqual([]);
  });

  it('does not touch the Quran or Azkar histories', () => {
    addRecentSearch('FIXTURE quran');
    addAzkarRecentSearch('FIXTURE azkar');
    addHadithRecentSearch('FIXTURE hadith');
    clearHadithRecentSearches();
    expect(readRecentSearches()).toEqual(['FIXTURE quran']);
    expect(readAzkarRecentSearches()).toEqual(['FIXTURE azkar']);
  });
});
