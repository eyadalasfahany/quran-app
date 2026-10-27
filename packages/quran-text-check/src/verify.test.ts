import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadTanzil } from './tanzil.ts';
import { verifyTanzil } from './verify.ts';

test('changing one character in a copied text fails the checksum', () => {
  const loaded = loadTanzil();
  const ayahs = loaded.ayahs.map((ayah, index) => {
    if (index !== 0) {
      return ayah;
    }

    return { ...ayah, text: `X${ayah.text.slice(1)}` };
  });
  const result = verifyTanzil({ ...loaded, ayahs });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes('checksum')));
});

test('dropping one line fails the count', () => {
  const loaded = loadTanzil();
  const result = verifyTanzil({ ...loaded, ayahs: loaded.ayahs.slice(0, -1) });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes('count')));
});
