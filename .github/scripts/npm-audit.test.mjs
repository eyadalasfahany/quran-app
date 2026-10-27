import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { blockingAdvisories, evaluate } from './npm-audit.mjs';

const zodReport = {
  vulnerabilities: {
    zod: {
      via: [
        {
          name: 'zod',
          severity: 'high',
          title: 'Zod can exhaust memory',
          url: 'https://github.com/advisories/GHSA-mrhx-c7xc-m3w5',
        },
      ],
    },
    '@expo/cli': { via: ['zod'] },
    lodash: {
      via: [{ name: 'lodash', severity: 'moderate', title: 'Moderate issue', url: 'https://github.com/advisories/GHSA-moderate' }],
    },
  },
};

const zodEntry = { id: 'GHSA-mrhx-c7xc-m3w5', reason: 'build-time only', reviewBy: '2027-01-31' };

describe('blockingAdvisories', () => {
  it('keeps high and critical advisories once each, skipping package references and lower severities', () => {
    assert.deepEqual(blockingAdvisories(zodReport), [
      { id: 'GHSA-mrhx-c7xc-m3w5', package: 'zod', severity: 'high', title: 'Zod can exhaust memory' },
    ]);
  });
});

describe('evaluate', () => {
  const advisories = blockingAdvisories(zodReport);

  it('passes an allowlisted advisory before its review date', () => {
    const result = evaluate(advisories, [zodEntry], '2026-10-27');

    assert.deepEqual(result.failures, []);
    assert.equal(result.allowed.length, 1);
  });

  it('fails an advisory that is not allowlisted', () => {
    assert.match(evaluate(advisories, [], '2026-10-27').failures[0], /^Not allowlisted: GHSA-mrhx-c7xc-m3w5/);
  });

  it('fails once the review date has passed', () => {
    assert.match(evaluate(advisories, [zodEntry], '2027-02-01').failures[0], /expired on 2027-01-31/);
  });

  it('fails an entry whose advisory is gone', () => {
    assert.match(evaluate([], [zodEntry], '2026-10-27').failures[0], /^Unused allowlist entry GHSA-mrhx-c7xc-m3w5/);
  });

  it('fails an entry without a reason or a valid date', () => {
    const result = evaluate(advisories, [{ id: 'GHSA-mrhx-c7xc-m3w5', reviewBy: 'soon' }], '2026-10-27');

    assert.match(result.failures[0], /needs an id, a reason and a reviewBy date/);
  });
});
