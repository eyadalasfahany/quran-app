import { FillType } from '@shopify/react-native-skia';
import { resetSkiaCalls, skiaCalls } from '../../../../jest/skia-mock';
import { buildPagePath, PagePictureCache, recordPagePicture, toSkMatrix } from './page-picture';
import type { SvgPageModel } from './svg-page-model';
import { SvgPageParseError } from './svg-page-model';

jest.mock('@shopify/react-native-skia', () => jest.requireActual('../../../../jest/skia-mock'));

// Placeholder paths and matrices; no artwork.
const model = (...ds: string[]): SvgPageModel => ({
  origin: { x: 0, y: 0 },
  pieces: ds.map((d, index) => ({ d, matrix: [1, 0, 0, 1, index, 0] })),
  viewBox: { height: 550, width: 345 },
});

const ops = (name: string) => skiaCalls.filter((call) => call.op === name);

beforeEach(() => resetSkiaCalls());

describe('toSkMatrix', () => {
  it('turns the SVG matrix (a b c d e f) into Skia row-major order', () => {
    expect(toSkMatrix([1, 2, 3, 4, 5, 6])).toEqual([1, 3, 5, 2, 4, 6, 0, 0, 1]);
  });
});

describe('buildPagePath', () => {
  it('builds one path from every piece, with its matrix, and sets the even-odd fill once', () => {
    buildPagePath(model('M 0 0 Z', 'M 1 1 Z'));
    expect(ops('pathBuilder')).toHaveLength(1);
    const adds = ops('addPath');
    expect(adds).toHaveLength(2);
    // Piece 0 is the identity; piece 1 is translate(1 0), which Skia reads as e = 1 in row-major order.
    expect(adds[0]!.matrix).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    expect(adds[1]!.matrix).toEqual([1, 0, 1, 0, 1, 0, 0, 0, 1]);
    expect(ops('setFillType')).toEqual([{ fill: FillType.EvenOdd, op: 'setFillType' }]);
    expect(ops('build')).toHaveLength(1);
  });

  it('throws SvgPageParseError when one piece cannot be read, rather than drawing a page with a hole', () => {
    expect(() => buildPagePath(model('M 0 0 Z', 'UNREADABLE'))).toThrow(SvgPageParseError);
  });
});

describe('recordPagePicture', () => {
  it('records the path once in the given colour over the page box', () => {
    const path = buildPagePath(model('M 0 0 Z'));
    const picture = recordPagePicture(path, 'ink-colour');
    expect(picture).toBeDefined();
    expect(ops('beginRecording')).toEqual([{ op: 'beginRecording', rect: { height: 550, width: 345, x: 0, y: 0 } }]);
    expect(ops('drawPath')).toEqual([expect.objectContaining({ color: 'ink-colour' })]);
    expect(ops('finishRecording')).toHaveLength(1);
  });
});

describe('PagePictureCache', () => {
  it('builds the path once per page id and reuses it', () => {
    const cache = new PagePictureCache(8);
    const page = model('M 0 0 Z');
    cache.picture('hafs:1:50', page, 'a');
    cache.picture('hafs:1:50', page, 'a');
    expect(ops('pathBuilder')).toHaveLength(1);
    expect(ops('finishRecording')).toHaveLength(1);
  });

  it('records a second colour without rebuilding the path', () => {
    const cache = new PagePictureCache(8);
    const page = model('M 0 0 Z');
    const dark = cache.picture('hafs:1:50', page, 'ink');
    const light = cache.picture('hafs:1:50', page, 'on-brand');
    expect(light).not.toBe(dark);
    expect(ops('pathBuilder')).toHaveLength(1);
    expect(ops('drawPath').map((call) => call.color)).toEqual(['ink', 'on-brand']);
  });

  it('clearPictures drops the pictures but keeps the paths', () => {
    const cache = new PagePictureCache(8);
    const page = model('M 0 0 Z');
    cache.picture('hafs:1:50', page, 'ink');
    cache.clearPictures();
    cache.picture('hafs:1:50', page, 'ink');
    expect(ops('pathBuilder')).toHaveLength(1);
    expect(ops('finishRecording')).toHaveLength(2);
  });

  it('evicts the least recently used page beyond its capacity', () => {
    const cache = new PagePictureCache(1);
    cache.picture('a', model('M 0 0 Z'), 'ink');
    cache.picture('b', model('M 0 0 Z'), 'ink');
    cache.picture('a', model('M 0 0 Z'), 'ink');
    expect(ops('pathBuilder')).toHaveLength(3);
  });

  it('a page whose path cannot be read throws', () => {
    expect(() => new PagePictureCache(8).picture('x', model('UNREADABLE'), 'ink')).toThrow(SvgPageParseError);
  });
});
