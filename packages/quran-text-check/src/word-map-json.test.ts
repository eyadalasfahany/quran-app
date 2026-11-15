import assert from 'node:assert/strict';
import { test } from 'node:test';

import { splitBasmala } from './basmala.ts';
import { loadTanzil } from './tanzil.ts';
import { committedApiWordMap, renderApiWordMap } from './word-map-json.ts';

type ApiWordMap = Record<string, string[]>;

test('the committed API word map is the generated one (regenerate with npm run word-map:api)', () => {
  assert.equal(committedApiWordMap(), renderApiWordMap());
});

test('the API word map has 6,236 verses and 77,433 quoted words, in Quran order', () => {
  const map = JSON.parse(committedApiWordMap()) as ApiWordMap;
  const keys = Object.keys(map);
  const words = keys.reduce((total, key) => total + (map[key]?.length ?? 0), 0);

  assert.equal(keys.length, 6236);
  assert.equal(words, 77433);
  assert.equal(keys[0], '1:1');
  assert.equal(keys.at(-1), '114:6');
  assert.equal(map['2:181']?.length, 14);
});

test('each verse rejoins with one space to the Simple text the seed uses, so positions are byte-exact slices', () => {
  const map = JSON.parse(committedApiWordMap()) as ApiWordMap;
  const { simpleAyahs } = loadTanzil();

  for (const simple of simpleAyahs) {
    const key = `${simple.sura}:${simple.aya}`;
    const expected = splitBasmala(simple.sura, simple.aya, simple.text).text;

    assert.equal(map[key]?.join(' '), expected, `${key} does not rejoin`);
  }
});

test('no word is empty, and the word list of a verse has no end marker', () => {
  const map = JSON.parse(committedApiWordMap()) as ApiWordMap;

  for (const [key, words] of Object.entries(map)) {
    assert.ok(words.length > 0, `${key} has no words`);
    assert.ok(words.every((word) => word !== ''), `${key} has an empty word`);
  }
});
