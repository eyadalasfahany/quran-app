import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type AudioSegmentMerge = {
  verse_key: string;
  merged_positions: readonly [number, number];
  reason: string;
};

let cachedMerges: readonly AudioSegmentMerge[] | undefined;

export function audioSegmentMerges(): readonly AudioSegmentMerge[] {
  cachedMerges ??= parseMerges(JSON.parse(readFileSync(mergesPath(), 'utf8')));
  return cachedMerges;
}

function mergesPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '../data/audio-segment-merges.json');
}

function parseMerges(value: unknown): AudioSegmentMerge[] {
  if (!Array.isArray(value)) {
    throw new Error('audio-segment-merges.json must be an array.');
  }

  const seen = new Set<string>();

  return value.map((entry) => {
    if (!isRecord(entry)) {
      throw new Error('An audio segment merge is not an object.');
    }

    const verseKey = entry.verse_key;
    const reason = entry.reason;
    const positions = entry.merged_positions;

    if (typeof verseKey !== 'string' || verseKey === '' || typeof reason !== 'string' || reason === '') {
      throw new Error('An audio segment merge needs verse_key and reason.');
    }

    if (seen.has(verseKey)) {
      throw new Error(`Duplicate audio segment merge for ${verseKey}.`);
    }

    seen.add(verseKey);

    if (!Array.isArray(positions) || positions.length !== 2) {
      throw new Error(`${verseKey} merged_positions must be two word positions.`);
    }

    const first = positions[0];
    const second = positions[1];

    if (typeof first !== 'number' || typeof second !== 'number' || !Number.isInteger(first) || !Number.isInteger(second)) {
      throw new Error(`${verseKey} merged_positions must be integers.`);
    }

    if (first < 1 || second !== first + 1) {
      throw new Error(`${verseKey} merged_positions must be two consecutive word positions.`);
    }

    return {
      verse_key: verseKey,
      merged_positions: [first, second],
      reason,
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
