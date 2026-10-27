import assert from 'node:assert/strict';
import { test } from 'node:test';

import { splitBasmala } from './basmala.ts';
import { loadTanzil, type Ayah } from './tanzil.ts';

const loaded = loadTanzil();

test('splits the Basmala from 112 Uthmani and Simple verses, including 95:1 and 97:1', () => {
  assert.equal(splitCount(loaded.ayahs), 112);
  assert.equal(splitCount(loaded.simpleAyahs), 112);

  for (const ayahs of [loaded.ayahs, loaded.simpleAyahs]) {
    assert.equal(splitBasmala(1, 1, textOf(ayahs, 1, 1)).bismillah, null);
    assert.equal(splitBasmala(9, 1, textOf(ayahs, 9, 1)).bismillah, null);

    for (const sura of [95, 97]) {
      const split = splitBasmala(sura, 1, textOf(ayahs, sura, 1));
      assert.ok(split.bismillah?.startsWith('بِّسْمِ'));
    }
  }
});

test('rejoining the Basmala reproduces every Tanzil line', () => {
  for (const ayahs of [loaded.ayahs, loaded.simpleAyahs]) {
    for (const ayah of ayahs) {
      const split = splitBasmala(ayah.sura, ayah.aya, ayah.text);
      const rebuilt = split.bismillah === null ? split.text : `${split.bismillah} ${split.text}`;
      assert.equal(rebuilt, ayah.text);
    }
  }
});

function splitCount(ayahs: readonly Ayah[]): number {
  return ayahs.filter((ayah) => splitBasmala(ayah.sura, ayah.aya, ayah.text).bismillah !== null).length;
}

function textOf(ayahs: readonly Ayah[], sura: number, aya: number): string {
  const ayah = ayahs.find((candidate) => candidate.sura === sura && candidate.aya === aya);
  assert.ok(ayah);
  return ayah.text;
}
