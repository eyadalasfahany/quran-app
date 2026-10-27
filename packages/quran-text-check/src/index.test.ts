import assert from 'node:assert/strict';
import { test } from 'node:test';

import { verifyTanzil } from './index.ts';

test('verifyTanzil passes on the pinned Tanzil files', () => {
  const result = verifyTanzil();

  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
});
