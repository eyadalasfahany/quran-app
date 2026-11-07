import { rawColorLiterals } from '../../../jest/ui-source';

import {
  coverGround,
  coverGrounds,
  coverMetrics,
  coverOrnament,
  coverOrnaments,
  coverSlugs,
  fallbackGround,
  fallbackOrnament,
  isCoverSlug,
} from './collection-cover';

describe('collection cover data', () => {
  it.each([
    ['bukhari', 'coverGreen'],
    ['nasai', 'coverGreen'],
    ['shahwaliullah40', 'coverGreen'],
    ['muslim', 'coverMaroon'],
    ['malik', 'coverMaroon'],
    ['qudsi40', 'coverMaroon'],
    ['abudawud', 'coverNavy'],
    ['nawawi40', 'coverNavy'],
    ['tirmidhi', 'coverBrown'],
    ['ibnmajah', 'coverBrown'],
  ])('maps %s to its tone', (slug, tone) => {
    expect(coverGrounds[slug as keyof typeof coverGrounds]).toBe(tone);
    expect(coverGround(slug)).toBe(tone);
  });

  it.each([
    ['bukhari', 'star'],
    ['nawawi40', 'star'],
    ['qudsi40', 'star'],
    ['muslim', 'rings'],
    ['tirmidhi', 'rings'],
    ['nasai', 'rings'],
    ['abudawud', 'diamond'],
    ['ibnmajah', 'diamond'],
    ['malik', 'diamond'],
    ['shahwaliullah40', 'diamond'],
  ])('maps %s to its ornament', (slug, shape) => {
    expect(coverOrnaments[slug as keyof typeof coverOrnaments]).toBe(shape);
    expect(coverOrnament(slug)).toBe(shape);
  });

  it('uses the neutral ground and the star for null and unknown slugs', () => {
    for (const slug of [null, undefined, 'unknown', '', 'nawawi']) {
      expect(coverGround(slug)).toBe('coverNeutral');
      expect(coverOrnament(slug)).toBe('star');
    }
    expect(fallbackGround).toBe('coverNeutral');
    expect(fallbackOrnament).toBe('star');
  });

  it('lists exactly the ten canonical slugs', () => {
    expect([...coverSlugs]).toEqual([
      'bukhari',
      'muslim',
      'abudawud',
      'tirmidhi',
      'ibnmajah',
      'nasai',
      'malik',
      'nawawi40',
      'qudsi40',
      'shahwaliullah40',
    ]);
    expect(isCoverSlug('qudsi40')).toBe(true);
    expect(isCoverSlug('nawawi')).toBe(false);
    expect(isCoverSlug(null)).toBe(false);
  });

  it('defines metrics for list, header and compact', () => {
    expect(coverMetrics.list).toMatchObject({ width: 56, height: 75 });
    expect(coverMetrics.header).toMatchObject({ width: 96, height: 128 });
    expect(coverMetrics.compact).toMatchObject({ width: 40, height: 53 });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('collection-cover.ts')).toEqual([]);
  });
});
