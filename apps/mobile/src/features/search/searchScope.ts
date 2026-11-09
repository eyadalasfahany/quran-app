export type SearchScope = 'quran' | 'hadith' | 'azkar';

let sessionScope: SearchScope = 'quran';

export function readSessionSearchScope(): SearchScope {
  return sessionScope;
}

export function rememberSessionSearchScope(scope: SearchScope): void {
  sessionScope = scope;
}
