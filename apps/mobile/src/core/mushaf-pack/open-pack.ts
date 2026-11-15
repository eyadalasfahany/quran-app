import { File } from 'expo-file-system';
import { openDatabaseSync } from 'expo-sqlite';

import { createExpoSqlExecutor } from '@/core/db/expo-sql-executor';

import { getInstalledSvgMushaf } from './installed-store';
import { databaseLocation, svgMushafPackPath } from './paths';
import { SvgMushafPackReader } from './SvgMushafPackReader';
import type { SvgMushafKey } from './types';

const readers = new Map<SvgMushafKey, SvgMushafPackReader>();

/**
 * A new, uncached, read-only connection to one file. The installer uses it to check a fresh download and closes it.
 * expo-sqlite creates an empty database for a missing file, so the file must exist first.
 * shortcut: expo-sqlite cannot open read-only, so `query_only` is the guard here (ADR 0090 Q4), upgrade if the library gains a read-only open.
 */
export function openSvgMushafPackAt(path: string): SvgMushafPackReader {
  if (!new File(path).exists) {
    throw new Error(`The SVG mushaf pack is missing: ${path}`);
  }
  const { name, directory } = databaseLocation(path);
  const database = openDatabaseSync(name, { useNewConnection: true }, directory);
  try {
    database.execSync('PRAGMA query_only = ON');
    return new SvgMushafPackReader(createExpoSqlExecutor(database), () => database.closeSync());
  } catch (error) {
    database.closeSync();
    throw error;
  }
}

/** The cached reader of the recorded version only. Null when nothing is recorded or the recorded file is gone. */
export function openSvgMushafPack(key: SvgMushafKey): SvgMushafPackReader | null {
  const cached = readers.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const record = getInstalledSvgMushaf(key);
  if (record === undefined) {
    return null;
  }
  const path = svgMushafPackPath(key, record.version);
  if (!new File(path).exists) {
    return null;
  }
  const reader = openSvgMushafPackAt(path);
  readers.set(key, reader);
  return reader;
}

export function closeSvgMushafPack(key: SvgMushafKey): void {
  const reader = readers.get(key);
  if (reader !== undefined) {
    reader.close();
    readers.delete(key);
  }
}
