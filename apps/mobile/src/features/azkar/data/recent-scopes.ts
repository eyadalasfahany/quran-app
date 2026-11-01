import { useSyncExternalStore } from 'react';

import { storage, storageKeys } from '@/core/storage/mmkv';

/** How many recently opened Azkar scopes Home keeps (ADR 0034 §3). */
export const RECENT_SCOPES_CAP = 10;

/** A scope the reader opened: its progress key (`category:<id>` or `entry:<key>`) and when it was opened. */
export type RecentScope = { scopeKey: string; openedAt: number };

function isRecentScope(value: unknown): value is RecentScope {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.scopeKey === 'string' && typeof candidate.openedAt === 'number';
}

/** The saved history, newest first. A damaged value reads as empty rather than throwing. */
export function readRecentScopes(): RecentScope[] {
  const raw = storage.getString(storageKeys.azkar.recentScopes);
  return parseRecentScopes(raw);
}

function parseRecentScopes(raw: string | undefined): RecentScope[] {
  if (raw === undefined) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isRecentScope).slice(0, RECENT_SCOPES_CAP);
  } catch {
    return [];
  }
}

/**
 * Records that a scope was opened. It moves to the front (one row per scope, even when reopened) and the list keeps
 * the newest `RECENT_SCOPES_CAP` entries.
 */
export function recordRecentScope(scopeKey: string, now: number = Date.now()): RecentScope[] {
  const next = [{ openedAt: now, scopeKey }, ...readRecentScopes().filter((scope) => scope.scopeKey !== scopeKey)].slice(
    0,
    RECENT_SCOPES_CAP,
  );
  storage.set(storageKeys.azkar.recentScopes, JSON.stringify(next));
  return next;
}

export function clearRecentScopes(): void {
  storage.remove(storageKeys.azkar.recentScopes);
}

function subscribe(onChange: () => void): () => void {
  const listener = storage.addOnValueChangedListener((key) => {
    if (key === storageKeys.azkar.recentScopes) {
      onChange();
    }
  });
  return () => listener.remove();
}

function snapshot(): string | undefined {
  return storage.getString(storageKeys.azkar.recentScopes);
}

/** The recent scopes, newest first. Follows every recording, so Home is never stale. */
export function useRecentScopes(): RecentScope[] {
  const raw = useSyncExternalStore(subscribe, snapshot, snapshot);
  return parseRecentScopes(raw);
}
