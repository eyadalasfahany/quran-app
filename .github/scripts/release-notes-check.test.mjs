import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkReleaseNotes } from './release-notes-check.mjs';

const check = (notes, { appVersion = '1.0.3', tagVersion = '1.0.3' } = {}) =>
  checkReleaseNotes({ appVersion, tagVersion, notes });

describe('checkReleaseNotes', () => {
  it('passes valid Arabic and English notes for a matching tag', () => {
    assert.deepEqual(check({ ar: 'نص تجريبي ١ — ليس ملاحظات', en: 'FIXTURE notes 1 — not real notes' }), []);
  });

  it('fails when the tag does not match the app version', () => {
    assert.deepEqual(
      check({ ar: 'نص', en: 'text' }, { tagVersion: '1.0.4' }),
      ['Tag mobile-v1.0.4 does not match app.config.ts version 1.0.3.'],
    );
  });

  it('fails when the Arabic file is missing', () => {
    assert.deepEqual(check({ ar: null, en: 'text' }), [
      'Missing infra/store-release/release-notes/1.0.3/ar.txt.',
    ]);
  });

  it('fails when the English text is whitespace only', () => {
    assert.deepEqual(check({ ar: 'نص', en: '  \n\t ' }), [
      'infra/store-release/release-notes/1.0.3/en.txt is empty.',
    ]);
  });

  it('allows exactly 500 characters and fails at 501', () => {
    assert.deepEqual(check({ ar: 'ب'.repeat(500), en: 'text' }), []);
    const failures = check({ ar: 'ب'.repeat(501), en: 'text' });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /501 characters; the limit is 500/);
  });

  it('counts code points, not UTF-16 units', () => {
    // Each emoji is one code point but two UTF-16 units: 250 of them is 500 code points.
    assert.deepEqual(check({ ar: '😀'.repeat(500), en: 'text' }), []);
    assert.equal(check({ ar: '😀'.repeat(501), en: 'text' }).length, 1);
  });

  it('fails when the English notes name iPhone', () => {
    const failures = check({ ar: 'نص', en: 'Now on iPhone' });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /names a platform or store/);
  });

  it('fails when the Arabic notes name Android', () => {
    assert.equal(check({ ar: 'تحسينات على أندرويد', en: 'text' }).length, 1);
  });

  it('fails when the text contains U+06DA (Quranic annotation mark)', () => {
    const failures = check({ ar: 'نص\u06DAتجريبي', en: 'text' });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /Quran script/);
  });

  it('does not treat iOSX as the platform name iOS (word boundary)', () => {
    assert.deepEqual(check({ ar: 'نص', en: 'Faster on iOSX builds' }), []);
  });
});
