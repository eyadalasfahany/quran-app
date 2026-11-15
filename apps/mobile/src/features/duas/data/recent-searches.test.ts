import { storage, storageKeys } from '@/core/storage/mmkv';

import {
  addDuasRecentSearch,
  clearDuasRecentSearches,
  DUAS_RECENT_SEARCHES_MAX,
  readDuasRecentSearches,
  removeDuasRecentSearch,
} from './recent-searches';

describe('duas recent searches', () => {
  beforeEach(() => {
    storage.remove(storageKeys.duas.searchRecent);
  });

  it('keeps the newest query first, without repeats or blanks', () => {
    addDuasRecentSearch('الموت');
    addDuasRecentSearch('السفر');
    expect(addDuasRecentSearch('  الموت  ')).toEqual(['الموت', 'السفر']);
    expect(addDuasRecentSearch('   ')).toEqual(['الموت', 'السفر']);
  });

  it('caps the history', () => {
    for (let index = 0; index < DUAS_RECENT_SEARCHES_MAX + 3; index += 1) {
      addDuasRecentSearch(`query ${index}`);
    }
    expect(readDuasRecentSearches()).toHaveLength(DUAS_RECENT_SEARCHES_MAX);
  });

  it('removes one query and clears all', () => {
    addDuasRecentSearch('الموت');
    addDuasRecentSearch('السفر');

    expect(removeDuasRecentSearch('الموت')).toEqual(['السفر']);
    expect(clearDuasRecentSearches()).toEqual([]);
    expect(readDuasRecentSearches()).toEqual([]);
  });

  it('keeps its history apart from the Azkar one', () => {
    addDuasRecentSearch('الموت');
    expect(storage.getString(storageKeys.azkar.searchRecent)).toBeUndefined();
  });
});
