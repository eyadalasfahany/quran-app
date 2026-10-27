import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { audioSegmentMerges } from './audio-segment-merges.ts';
import { assessWordMap } from './fixture-assessment.ts';
import { buildChapterBismillah, buildWordMap } from './word-map.ts';
import { renderWordMapReport, wordMapReportPath } from './word-map-report.ts';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('the word map has one end row per verse and the chapter Basmala for 112 surahs', () => {
  const rows = buildWordMap();
  const ends = rows.filter((row) => row.char_type === 'end');
  assert.equal(ends.length, 6236);
  assert.equal(new Set(ends.map((row) => row.verse_id)).size, 6236);

  const chapters = buildChapterBismillah();
  assert.equal(chapters.size, 112);
  assert.equal(chapters.has(1), false);
  assert.equal(chapters.has(9), false);
  assert.notEqual(chapters.get(2)?.uthmani, chapters.get(95)?.uthmani);
  assert.ok(chapters.get(95)?.uthmani.startsWith('بِّسْمِ'));
  assert.ok(chapters.get(97)?.uthmani.startsWith('بِّسْمِ'));
});

test('fixture validation has no unexpected mismatches and the report lists the same disputed verses', () => {
  const assessment = assessWordMap();
  const report = readFileSync(wordMapReportPath(), 'utf8');
  const fixture = JSON.parse(readFileSync(join(packageRoot, 'test-fixtures/qf-word-counts.json'), 'utf8')) as {
    verses: Record<string, { audio: [number, number]; layout?: number }>;
  };
  const fixtureDisputed = Object.entries(fixture.verses)
    .filter(([, verse]) => verse.audio[0] !== verse.audio[1])
    .map(([verseKey]) => verseKey);
  const rows = buildWordMap();
  const opening = rows.filter((row) => row.verse_key === '2:181');

  assert.equal(opening.filter((row) => row.char_type === 'word').length, 14);
  assert.equal(opening.filter((row) => row.char_type === 'end').length, 1);
  assert.equal(assessment.unexpected.length, 0);
  assert.equal(assessment.alignmentFailures.length, 0);
  assert.deepEqual(
    assessment.audioMerges.map((verse) => verse.verse_key),
    audioSegmentMerges().map((merge) => merge.verse_key),
  );

  for (const merge of audioSegmentMerges()) {
    const verse = fixture.verses[merge.verse_key];
    const listed = assessment.audioMerges.find((item) => item.verse_key === merge.verse_key);
    assert.ok(verse);
    assert.ok(listed);
    assert.equal(verse.audio[0], verse.audio[1]);
    assert.equal(verse.audio[0], listed.count - 1);
    if (verse.layout !== undefined) {
      assert.equal(verse.layout, listed.count);
    }
    assert.deepEqual(listed.merged_positions, merge.merged_positions);
  }

  assert.equal(report, renderWordMapReport(assessment));
  assert.deepEqual(sectionKeys(report, 'Audio-disputed verses'), assessment.disputed.map((verse) => verse.verse_key));
  assert.deepEqual(sorted(assessment.disputed.map((verse) => verse.verse_key)), sorted(fixtureDisputed));
  assert.deepEqual(sectionKeys(report, 'Known audio merges'), ['2:181', '8:6', '13:37']);
  assert.deepEqual(sectionKeys(report, 'Unexpected mismatches'), ['None.']);
  assert.deepEqual(sectionKeys(report, 'Alignment failures'), ['None.']);
  assert.match(report, /Unexpected mismatches: 0/);
});

function sectionKeys(report: string, heading: string): string[] {
  const section = report.split(/^## /m).find((part) => part.startsWith(`${heading}\n`));
  assert.ok(section);
  return section
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => {
      const match = /^- `(\d+:\d+)`:/.exec(line);
      return match?.[1] ?? line;
    });
}

function sorted(verseKeys: readonly string[]): string[] {
  return [...verseKeys].sort((left, right) => rank(left) - rank(right));
}

function rank(verseKey: string): number {
  const [sura, aya] = verseKey.split(':');
  return Number(sura) * 1000 + Number(aya);
}
