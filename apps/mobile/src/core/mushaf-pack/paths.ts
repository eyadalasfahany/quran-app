import { Paths } from 'expo-file-system';

import type { SvgMushafKey } from './types';

// Under documents, not caches: the OS may clear the cache, and a 90 MB pack must survive it.
export function svgMushafPackDirectory(): string {
  return `${Paths.document.uri.replace(/\/+$/, '')}/packs`;
}

export function svgMushafPackPath(key: SvgMushafKey, version: number): string {
  return `${svgMushafPackDirectory()}/svg-mushaf-${key}-${version}.db`;
}

export function svgMushafPartPath(key: SvgMushafKey, version: number): string {
  return `${svgMushafPackPath(key, version)}.part`;
}

/** Splits a file path into the name and directory that `openDatabaseSync` takes. Spaces arrive as %20 and are decoded. */
export function databaseLocation(path: string): { name: string; directory: string } {
  const plain = decodeURIComponent(path.replace(/^file:\/\//, ''));
  const index = plain.lastIndexOf('/');
  return { name: plain.slice(index + 1), directory: plain.slice(0, index) };
}
