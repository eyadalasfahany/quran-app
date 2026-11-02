import fs from 'node:fs';
import path from 'node:path';

import fullFixture from '../snapshot/__fixtures__/full.json';

const SWIFT_PATH = path.join(
  __dirname,
  '../../../../targets/widget/_shared/Snapshot.swift',
);

function topLevelFixtureKeys(): string[] {
  return Object.keys(fullFixture);
}

describe('Snapshot.swift CodingKeys drift guard', () => {
  it('Swift TaybahSnapshot top-level fields match the golden fixture', () => {
    const swift = fs.readFileSync(SWIFT_PATH, 'utf8');
    for (const key of topLevelFixtureKeys()) {
      expect(swift).toMatch(new RegExp(`let\\s+${key}:`));
    }
  });

  it('declares optional widgetTapsTotal on misbaha (iOS widget merge)', () => {
    const swift = fs.readFileSync(SWIFT_PATH, 'utf8');
    expect(swift).toMatch(/struct Misbaha[\s\S]*let widgetTapsTotal: Int\?/);
  });

  it('parses golden fixture keys the TS schema uses', () => {
    const swift = fs.readFileSync(SWIFT_PATH, 'utf8');
    for (const key of ['prayer', 'progress', 'reading', 'wird', 'misbaha', 'azkar', 'labels']) {
      expect(swift).toMatch(new RegExp(`let\\s+${key}:`));
    }
  });
});
