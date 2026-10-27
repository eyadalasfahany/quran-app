import assert from 'node:assert/strict';
import { test } from 'node:test';

import { splitBasmala } from './basmala.ts';
import { loadTanzil, type Ayah } from './tanzil.ts';
import { audioSegmentMerges } from './audio-segment-merges.ts';
import {
  alignImlaei,
  splitUthmaniWords,
  WordSplitError,
  type ImlaeiWord,
  type UthmaniWord,
} from './words.ts';

const loaded = loadTanzil();
const PAUSE_MARKS = new Set<number>([0x06d6, 0x06d7, 0x06d8, 0x06d9, 0x06da, 0x06db, 0x06dc, 0x06e2, 0x06ed]);

test('Uthmani words rejoin every verse after the Basmala split', () => {
  for (const ayah of loaded.ayahs) {
    const split = splitBasmala(ayah.sura, ayah.aya, ayah.text);
    const words = splitUthmaniWords(`${ayah.sura}:${ayah.aya}`, split.text);
    assert.equal(wordText(words).join(' '), split.text);
    assert.equal(words.at(-1)?.char_type, 'end');
    assert.equal(words.at(-1)?.text, '');
  }
});

test('fixed Uthmani verses keep QF word positions and attached marks', () => {
  const opening = wordsFor(1, 1);
  assert.equal(wordText(opening.words).length, 4);
  assert.deepEqual(opening.words.at(-1), { position: 5, char_type: 'end', text: '' });

  assert.equal(wordText(wordsFor(2, 255).words).length, 50);
  assert.equal(wordText(wordsFor(112, 1).words).length, 4);

  const example = wordsFor(2, 26);
  assert.equal(example.words[0]?.text.startsWith('۞ '), true);
  assertAttached(example.split.text, example.words, (token) => isOnly(token, (codePoint) => PAUSE_MARKS.has(codePoint)));

  const sajdah = wordsFor(7, 206);
  assertAttached(sajdah.split.text, sajdah.words, (token) => isOnly(token, (codePoint) => codePoint === 0x06e9));
  assert.equal(sajdah.words.at(-2)?.text.endsWith(' ۩'), true);

  for (const merge of audioSegmentMerges()) {
    const [sura, aya] = merge.verse_key.split(':').map(Number);
    assert.ok(sura !== undefined && aya !== undefined);
    const words = wordsFor(sura, aya).words.filter((word) => word.char_type === 'word');
    const [first, second] = merge.merged_positions;
    assert.equal(words.find((word) => word.position === first)?.text, 'بَعْدَ');
    assert.equal(words.find((word) => word.position === second)?.text, 'مَا');
    assert.equal(words.some((word) => word.text === 'بَعْدَ مَا'), false);
  }

  assert.equal(wordText(wordsFor(2, 181).words).length, 14);
  assert.equal(wordsFor(2, 181).words.at(-1)?.char_type, 'end');
});

test('an empty token or a rub mark with no following word fails', () => {
  assert.throws(() => splitUthmaniWords('1:1', 'ا  ب'), WordSplitError);
  assert.throws(() => splitUthmaniWords('1:1', 'ا ۞'), WordSplitError);
});

test("Imla'i text rejoins every verse and merges the known vocatives", () => {
  for (const [index, ayah] of loaded.ayahs.entries()) {
    const simple = loaded.simpleAyahs[index];
    assert.ok(simple);
    const verseKey = `${ayah.sura}:${ayah.aya}`;
    const uthmani = splitBasmala(ayah.sura, ayah.aya, ayah.text);
    const imlaei = splitBasmala(simple.sura, simple.aya, simple.text);
    const aligned = alignImlaei(splitUthmaniWords(verseKey, uthmani.text), imlaei.text, verseKey);
    assert.equal(
      aligned
        .filter((word) => word.char_type === 'word')
        .map((word) => word.text_imlaei)
        .join(' '),
      imlaei.text,
    );
    assert.equal(aligned.at(-1)?.text_imlaei, '');
  }

  assert.equal(firstImlaei(2, 21), joinTokens(simpleText(2, 21), 0, 2));
  assert.equal(firstImlaei(7, 19), joinTokens(simpleText(7, 19), 0, 2));

  const son = alignedFor(20, 94);
  assert.equal(son.imlaei[1]?.text_imlaei, joinTokens(son.simpleText, 1, 4));
});

function wordsFor(sura: number, aya: number): { split: ReturnType<typeof splitBasmala>; words: UthmaniWord[] } {
  const ayah = verse(loaded.ayahs, sura, aya);
  const split = splitBasmala(ayah.sura, ayah.aya, ayah.text);
  return { split, words: splitUthmaniWords(`${sura}:${aya}`, split.text) };
}

function alignedFor(sura: number, aya: number): { simpleText: string; imlaei: ImlaeiWord[] } {
  const uthmani = verse(loaded.ayahs, sura, aya);
  const simple = verse(loaded.simpleAyahs, sura, aya);
  const uthmaniSplit = splitBasmala(uthmani.sura, uthmani.aya, uthmani.text);
  const simpleSplit = splitBasmala(simple.sura, simple.aya, simple.text);
  return {
    simpleText: simpleSplit.text,
    imlaei: alignImlaei(splitUthmaniWords(`${sura}:${aya}`, uthmaniSplit.text), simpleSplit.text, `${sura}:${aya}`),
  };
}

function firstImlaei(sura: number, aya: number): string {
  return alignedFor(sura, aya).imlaei[0]?.text_imlaei ?? '';
}

function simpleText(sura: number, aya: number): string {
  return splitBasmala(sura, aya, verse(loaded.simpleAyahs, sura, aya).text).text;
}

function joinTokens(text: string, start: number, end: number): string {
  return text.split(' ').slice(start, end).join(' ');
}

function verse(ayahs: readonly Ayah[], sura: number, aya: number): Ayah {
  const ayah = ayahs.find((candidate) => candidate.sura === sura && candidate.aya === aya);
  assert.ok(ayah);
  return ayah;
}

function wordText(words: readonly UthmaniWord[]): string[] {
  return words.filter((word) => word.char_type === 'word').map((word) => word.text);
}

function assertAttached(text: string, words: readonly UthmaniWord[], marker: (token: string) => boolean): void {
  const tokens = text.split(' ');
  const index = tokens.findIndex(marker);
  const mark = tokens[index];
  const previous = tokens[index - 1];
  assert.ok(index > 0 && mark !== undefined && previous !== undefined);
  assert.equal(
    words.some((word) => word.text === `${previous} ${mark}`),
    true,
  );
  assert.equal(
    words.some((word) => word.text === mark),
    false,
  );
}

function isOnly(token: string, matches: (codePoint: number) => boolean): boolean {
  const points = [...token].map((char) => char.codePointAt(0));
  return points.length > 0 && points.every((codePoint) => codePoint !== undefined && matches(codePoint));
}
