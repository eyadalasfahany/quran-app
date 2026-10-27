import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { loadTanzil, parseTanzilText } from './tanzil.ts';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '../data');

test('parseTanzilText keeps everything after the second pipe', () => {
  const ayahs = parseTanzilText('1|1|left|right|tail\n');

  assert.deepEqual(ayahs, [{ sura: 1, aya: 1, text: 'left|right|tail' }]);
});

test('ayah 2:255 text matches the file bytes after the second pipe', () => {
  const file = readFileSync(join(dataDir, 'tanzil-quran-uthmani-1.1.txt'));
  const raw = textBytes(file, '2|255|');
  const parsed = parseTanzilText(file.toString('utf8')).find((ayah) => ayah.sura === 2 && ayah.aya === 255);

  assert.ok(raw);
  assert.ok(parsed);
  assert.ok(raw.equals(Buffer.from(parsed.text, 'utf8')));
});

test('metadata has the pinned structure counts', () => {
  const { metadata } = loadTanzil(dataDir);
  const baqara = metadata.suras.find((sura) => sura.index === 2);

  assert.equal(metadata.juzs.length, 30);
  assert.equal(metadata.hizbs.length, 240);
  assert.equal(metadata.pages.length, 604);
  assert.equal(metadata.sajdas.length, 15);
  assert.ok(baqara);
  assert.equal(baqara.ayas, 286);
});

function textBytes(file: Buffer, prefix: string): Buffer | undefined {
  const needle = Buffer.from(prefix, 'utf8');
  let start = 0;

  while (start < file.length) {
    const end = file.indexOf(0x0a, start);
    const stop = end === -1 ? file.length : end;
    const line = file.subarray(start, stop);

    if (line.subarray(0, needle.length).equals(needle)) {
      return line.subarray(needle.length);
    }

    if (end === -1) {
      return undefined;
    }

    start = end + 1;
  }

  return undefined;
}
