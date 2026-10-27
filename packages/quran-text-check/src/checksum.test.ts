import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ayahChecksum } from './checksum.ts';

test('checksum of a and b is the sha256 of those lines joined by a newline', () => {
  assert.equal(ayahChecksum(['a', 'b']), '7e18f737311b2dc3b2f269dd78396b0351f14fb66efa879f768cb23181883c78');
});
