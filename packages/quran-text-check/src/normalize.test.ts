import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeForSearch } from './normalize.ts';
import { loadTanzil } from './tanzil.ts';

test('normalizeForSearch maps the first word of 1:1 to بسم', () => {
  const word = firstWord(1, 1);

  assert.equal(word, 'بِسْمِ');
  assert.equal(normalizeForSearch(word), 'بسم');
});

test('normalizeForSearch maps the first word of 2:255 to الله', () => {
  const word = firstWord(2, 255);

  assert.equal(word, 'ٱللَّهُ');
  assert.equal(normalizeForSearch(word), 'الله');
});

test('normalizeForSearch removes Arabic diacritics U+064B through U+065F', () => {
  assert.equal(normalizeForSearch('ا\u064Bب\u065F'), 'اب');
});

test('normalizeForSearch removes superscript alef U+0670', () => {
  assert.equal(normalizeForSearch('ر\u0670'), 'ر');
});

test('normalizeForSearch removes Quranic annotation marks U+06D6 through U+06ED', () => {
  assert.equal(normalizeForSearch('ا\u06D6ب\u06ED'), 'اب');
});

test('normalizeForSearch removes tatweel U+0640', () => {
  assert.equal(normalizeForSearch('ب\u0640ب'), 'بب');
});

test('normalizeForSearch removes the rub el hizb sign U+06DE and the sajdah sign U+06E9', () => {
  assert.equal(normalizeForSearch('ا\u06DEب\u06E9'), 'اب');
});

test('normalizeForSearch maps alef variants to alef', () => {
  assert.equal(normalizeForSearch('\u0622\u0623\u0625\u0671'), 'اااا');
});

test('normalizeForSearch maps alef maksura to yeh', () => {
  assert.equal(normalizeForSearch('\u0649'), '\u064A');
});

test('normalizeForSearch maps teh marbuta to heh', () => {
  assert.equal(normalizeForSearch('\u0629'), '\u0647');
});

test('normalizeForSearch collapses whitespace and trims', () => {
  assert.equal(normalizeForSearch(' \tا   ب\nت  '), 'ا ب ت');
});

function firstWord(sura: number, aya: number): string {
  const ayah = loadTanzil().ayahs.find((candidate) => candidate.sura === sura && candidate.aya === aya);
  assert.ok(ayah);

  const word = ayah.text.split(' ')[0];
  assert.ok(word);

  return word;
}
