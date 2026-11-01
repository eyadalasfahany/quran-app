export type SearchScope = 'quran' | 'azkar';

// The scope the reader last picked (search.scope). It lives in memory, so it holds for this app session and resets on
// a cold start, as a session choice should.
let sessionScope: SearchScope = 'quran';

export function readSessionSearchScope(): SearchScope {
  return sessionScope;
}

export function rememberSessionSearchScope(scope: SearchScope): void {
  sessionScope = scope;
}
