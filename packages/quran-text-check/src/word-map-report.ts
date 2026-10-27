import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assessWordMap, type AssessedVerse, type KnownAudioMerge, type WordMapAssessment } from './fixture-assessment.ts';
import { loadWordExceptions } from './words.ts';

export function wordMapReportPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '../word-map-report.md');
}

export function renderWordMapReport(assessment: WordMapAssessment = assessWordMap()): string {
  const lines = [
    '# Tanzil word map',
    '',
    'Built from Tanzil Uthmani 1.1 and Tanzil Simple 1.1. Word counts are checked against `test-fixtures/qf-word-counts.json`, which is a test fixture and is not shipped.',
    '',
    `- Verses: ${assessment.verses}`,
    `- Uthmani Basmala splits: ${assessment.uthmaniBasmalaSplits}`,
    `- Simple Basmala splits: ${assessment.simpleBasmalaSplits}`,
    `- Word rows: ${assessment.wordRows}`,
    `- End rows: ${assessment.endRows}`,
    `- Unexpected mismatches: ${assessment.unexpected.length}`,
    `- Alignment failures: ${assessment.alignmentFailures.length}`,
    '',
    'Pause marks (U+06D6–U+06DC, U+06E2, U+06ED) and sajdah (U+06E9) attach to the previous word. Rub el hizb (U+06DE) attaches to the following word. A leading `۞` still counts when Simple merges the vocatives يا, ويا, فيا, أيا and ها with the next word.',
    '',
    'Word positions follow the mushaf layout count when the fixture has one. Otherwise they follow the audio count when both reciters agree. A verse in `data/audio-segment-merges.json` is expected to have one fewer audio position for each merged pair.',
    '',
    '## Exceptions',
    '',
    ...loadWordExceptions().map((entry) => `- \`${entry.verse_key}\`: ${entry.reason}`),
    '',
    '## Known audio merges',
    '',
    ...audioMergeLines(assessment.audioMerges),
    '',
    '## Audio-disputed verses',
    '',
    ...verseLines(assessment.disputed, false),
    '',
    '## Unexpected mismatches',
    '',
    ...verseLines(assessment.unexpected, true),
    '',
    '## Alignment failures',
    '',
    ...(assessment.alignmentFailures.length === 0
      ? ['None.']
      : assessment.alignmentFailures.map((failure) => `- ${failure}`)),
    '',
  ];

  return lines.join('\n');
}

export function writeWordMapReport(): WordMapAssessment {
  const assessment = assessWordMap();
  writeFileSync(wordMapReportPath(), renderWordMapReport(assessment));
  return assessment;
}

function audioMergeLines(merges: readonly KnownAudioMerge[]): string[] {
  if (merges.length === 0) {
    return ['None.'];
  }

  return merges.map((merge) => {
    const layout = merge.layout === null ? '' : `; layout ${merge.layout}`;
    const [first, second] = merge.merged_positions;
    return `- \`${merge.verse_key}\`: words ${merge.count}; audio ${merge.audio[0]}, ${merge.audio[1]}${layout}; merged positions ${first}, ${second}. ${merge.reason}`;
  });
}

function verseLines(verses: readonly AssessedVerse[], includeLayout: boolean): string[] {
  if (verses.length === 0) {
    return ['None.'];
  }

  return verses.map((verse) => {
    const layout = includeLayout && verse.layout !== null ? `; layout ${verse.layout}` : '';
    return `- \`${verse.verse_key}\`: words ${verse.count}; audio ${verse.audio[0]}, ${verse.audio[1]}${layout}`;
  });
}
