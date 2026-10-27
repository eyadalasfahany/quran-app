import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { audioSegmentMerges, type AudioSegmentMerge } from './audio-segment-merges.ts';
import { splitBasmala } from './basmala.ts';
import { loadTanzil } from './tanzil.ts';
import { collectWordMap, type WordMapRow } from './word-map.ts';

export type AssessedVerse = {
  verse_key: string;
  count: number;
  audio: readonly [number, number];
  layout: number | null;
};

export type KnownAudioMerge = AssessedVerse & {
  merged_positions: readonly [number, number];
  reason: string;
};

export type WordMapAssessment = {
  verses: number;
  uthmaniBasmalaSplits: number;
  simpleBasmalaSplits: number;
  wordRows: number;
  endRows: number;
  unexpected: AssessedVerse[];
  disputed: AssessedVerse[];
  audioMerges: KnownAudioMerge[];
  alignmentFailures: string[];
};

type FixtureEntry = {
  audio: readonly [number, number];
  layout: number | null;
};

export function assessWordMap(): WordMapAssessment {
  const loaded = loadTanzil();
  const collected = collectWordMap();
  const fixture = loadFixture();
  const counts = wordCounts(collected.rows);
  const merges = new Map(audioSegmentMerges().map((merge) => [merge.verse_key, merge]));
  const unexpected: AssessedVerse[] = [];
  const disputed: AssessedVerse[] = [];
  const audioMerges: KnownAudioMerge[] = [];

  for (const ayah of loaded.ayahs) {
    const verseKey = `${ayah.sura}:${ayah.aya}`;
    const entry = fixture.get(verseKey);
    const count = counts.get(verseKey);

    if (entry === undefined || count === undefined) {
      unexpected.push({
        verse_key: verseKey,
        count: count ?? -1,
        audio: entry?.audio ?? [0, 0],
        layout: entry?.layout ?? null,
      });
      continue;
    }

    const merge = merges.get(verseKey);
    const assessed = { verse_key: verseKey, count, audio: entry.audio, layout: entry.layout };
    const kind = classify(count, entry.audio, entry.layout, mergePairCount(merge));

    if (kind === 'disputed') {
      disputed.push(assessed);
    } else if (kind === 'unexpected') {
      unexpected.push(assessed);
    } else if (merge !== undefined) {
      audioMerges.push({ ...assessed, merged_positions: merge.merged_positions, reason: merge.reason });
    }
  }

  if (fixture.size !== loaded.ayahs.length) {
    for (const verseKey of fixture.keys()) {
      if (!counts.has(verseKey) && !unexpected.some((verse) => verse.verse_key === verseKey)) {
        const entry = fixture.get(verseKey);

        if (entry === undefined) {
          continue;
        }

        unexpected.push({ verse_key: verseKey, count: -1, audio: entry.audio, layout: entry.layout });
      }
    }
  }

  return {
    verses: loaded.ayahs.length,
    uthmaniBasmalaSplits: basmalaSplits(loaded.ayahs),
    simpleBasmalaSplits: basmalaSplits(loaded.simpleAyahs),
    wordRows: collected.rows.filter((row) => row.char_type === 'word').length,
    endRows: collected.rows.filter((row) => row.char_type === 'end').length,
    unexpected,
    disputed,
    audioMerges,
    alignmentFailures: collected.failures,
  };
}

function classify(
  count: number,
  audio: readonly [number, number],
  layout: number | null,
  mergedPairs: number,
): 'ok' | 'disputed' | 'unexpected' {
  const [first, second] = audio;

  if (first !== second) {
    return count === first || count === second ? 'disputed' : 'unexpected';
  }

  if (layout !== null) {
    if (count !== layout) {
      return 'unexpected';
    }

    return mergedPairs === 0 || first === count - mergedPairs ? 'ok' : 'unexpected';
  }

  return first === count - mergedPairs ? 'ok' : 'unexpected';
}

function mergePairCount(merge: AudioSegmentMerge | undefined): number {
  return merge === undefined ? 0 : 1;
}

function wordCounts(rows: readonly WordMapRow[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (row.char_type !== 'word') {
      continue;
    }

    counts.set(row.verse_key, (counts.get(row.verse_key) ?? 0) + 1);
  }

  return counts;
}

function basmalaSplits(ayahs: readonly { sura: number; aya: number; text: string }[]): number {
  return ayahs.filter((ayah) => splitBasmala(ayah.sura, ayah.aya, ayah.text).bismillah !== null).length;
}

function loadFixture(): Map<string, FixtureEntry> {
  const path = join(dirname(fileURLToPath(import.meta.url)), '../test-fixtures/qf-word-counts.json');
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));

  if (!isRecord(parsed) || !isRecord(parsed.verses)) {
    throw new Error('qf-word-counts.json has no verses object.');
  }

  const fixture = new Map<string, FixtureEntry>();

  for (const [verseKey, value] of Object.entries(parsed.verses)) {
    fixture.set(verseKey, fixtureEntry(verseKey, value));
  }

  return fixture;
}

function fixtureEntry(verseKey: string, value: unknown): FixtureEntry {
  if (!isRecord(value) || !Array.isArray(value.audio) || value.audio.length !== 2) {
    throw new Error(`Fixture verse ${verseKey} needs two audio counts.`);
  }

  const first = value.audio[0];
  const second = value.audio[1];

  if (typeof first !== 'number' || typeof second !== 'number') {
    throw new Error(`Fixture verse ${verseKey} audio counts must be numbers.`);
  }

  if (value.layout !== undefined && typeof value.layout !== 'number') {
    throw new Error(`Fixture verse ${verseKey} layout must be a number.`);
  }

  return {
    audio: [first, second],
    layout: typeof value.layout === 'number' ? value.layout : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
