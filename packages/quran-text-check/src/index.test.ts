import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NotImplementedError, verify } from './index.ts';

test('verify refuses to report a result before the checksum exists', () => {
  assert.throws(() => verify(), NotImplementedError);
});
