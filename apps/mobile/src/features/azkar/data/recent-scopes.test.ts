import { storage, storageKeys } from '@/core/storage/mmkv';

import { clearRecentScopes, readRecentScopes, RECENT_SCOPES_CAP, recordRecentScope } from './recent-scopes';

describe('recent Azkar scopes', () => {
  beforeEach(() => {
    storage.remove(storageKeys.azkar.recentScopes);
  });

  it('starts empty', () => {
    expect(readRecentScopes()).toEqual([]);
  });

  it('keeps the newest scope first', () => {
    recordRecentScope('category:morning', 100);
    recordRecentScope('entry:fixture-entry-1', 200);

    expect(readRecentScopes()).toEqual([
      { openedAt: 200, scopeKey: 'entry:fixture-entry-1' },
      { openedAt: 100, scopeKey: 'category:morning' },
    ]);
  });

  it('moves a reopened scope to the front instead of repeating it', () => {
    recordRecentScope('category:morning', 100);
    recordRecentScope('category:evening', 200);
    recordRecentScope('category:morning', 300);

    expect(readRecentScopes().map((scope) => scope.scopeKey)).toEqual(['category:morning', 'category:evening']);
    expect(readRecentScopes()[0]?.openedAt).toBe(300);
  });

  it('caps the history at ten, dropping the oldest', () => {
    for (let index = 1; index <= RECENT_SCOPES_CAP + 3; index += 1) {
      recordRecentScope(`entry:fixture-entry-${index}`, index);
    }

    const scopes = readRecentScopes();
    expect(scopes).toHaveLength(10);
    expect(scopes[0]?.scopeKey).toBe('entry:fixture-entry-13');
    expect(scopes[9]?.scopeKey).toBe('entry:fixture-entry-4');
  });

  it('reads a damaged value as empty, and skips malformed rows', () => {
    storage.set(storageKeys.azkar.recentScopes, '{not json');
    expect(readRecentScopes()).toEqual([]);

    storage.set(
      storageKeys.azkar.recentScopes,
      JSON.stringify([{ openedAt: 5, scopeKey: 'category:sleep' }, { openedAt: 'x' }, null]),
    );
    expect(readRecentScopes()).toEqual([{ openedAt: 5, scopeKey: 'category:sleep' }]);

    storage.set(storageKeys.azkar.recentScopes, JSON.stringify({ scopeKey: 'category:sleep' }));
    expect(readRecentScopes()).toEqual([]);
  });

  it('clears the history', () => {
    recordRecentScope('category:morning', 100);
    clearRecentScopes();
    expect(readRecentScopes()).toEqual([]);
  });
});
