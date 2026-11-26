import { FillType } from '@shopify/react-native-skia';
import { resetSkiaCalls, skiaCalls } from '../../../../jest/skia-mock';
import { buildPagePath, buildRunsPath, buildTqpPath, PagePictureCache, PageUnitPathCache, recordPagePicture, recordZoomPicture, toSkMatrix, ZoomPictureCache } from './page-picture';
import { goldenBlob, tqpBlobFor } from './__fixtures__/tqp/blob';
import { decodeTqp } from './tqp-decoder';
import { splitSubpaths } from './tqp-subpaths';
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

describe('buildTqpPath (builder ii)', () => {
  it('replays the relative calls on a PathBuilder and scales the result once by 1/32', () => {
    resetSkiaCalls();
    const decoded = { cmds: Uint8Array.from([0, 1, 2, 3, 4]), deltas: Int32Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]), n: 32 };
    buildTqpPath(decoded);
    expect(ops('rMoveTo')).toEqual([{ op: 'rMoveTo', x: 1, y: 2 }]);
    expect(ops('rLineTo')).toEqual([{ op: 'rLineTo', x: 3, y: 4 }]);
    expect(ops('rQuadTo')).toEqual([{ args: [5, 6, 7, 8], op: 'rQuadTo' }]);
    expect(ops('rCubicTo')).toEqual([{ args: [9, 10, 11, 12, 13, 14], op: 'rCubicTo' }]);
    expect(ops('close')).toHaveLength(1);
    expect(ops('addPath')).toEqual([expect.objectContaining({ matrix: [1 / 32, 0, 0, 0, 1 / 32, 0, 0, 0, 1] })]);
  });
});

describe('ZoomPictureCache', () => {
  const picture = (tag: string) => ({ tag }) as unknown as import('@shopify/react-native-skia').SkPicture;

  it('builds each (page, zoom, colour) once and reuses it', () => {
    const cache = new ZoomPictureCache();
    const build = jest.fn(() => picture('a'));
    expect(cache.picture('hafs:1', 1.5, 'ink', build)).toBe(cache.picture('hafs:1', 1.5, 'ink', build));
    expect(build).toHaveBeenCalledTimes(1);
  });

  it('drops the pictures of every other zoom when the zoom changes', () => {
    const cache = new ZoomPictureCache();
    const build = jest.fn(() => picture('x'));
    cache.picture('hafs:1', 1.5, 'ink', build);
    cache.picture('hafs:1', 2, 'ink', build);
    cache.clearZoom(2);
    cache.picture('hafs:1', 1.5, 'ink', build);
    expect(build).toHaveBeenCalledTimes(3);
    cache.picture('hafs:1', 2, 'ink', build);
    expect(build).toHaveBeenCalledTimes(3);
  });

  it('evicts the least recently used picture past its capacity', () => {
    const cache = new ZoomPictureCache(2);
    const build = jest.fn(() => picture('x'));
    cache.picture('a', 2, 'ink', build);
    cache.picture('b', 2, 'ink', build);
    cache.picture('c', 2, 'ink', build);
    cache.picture('a', 2, 'ink', build);
    expect(build).toHaveBeenCalledTimes(4);
  });
});

describe('PageUnitPathCache', () => {
  it('keeps the word paths of four pages, least recently used out first', () => {
    const cache = new PageUnitPathCache();
    const first = cache.pagePaths('p1');
    first.set('w', {} as never);
    for (const page of ['p2', 'p3', 'p4']) {
      cache.pagePaths(page);
    }
    // p1 was used last, so p2 is the least recently used and goes when p5 arrives.
    expect(cache.pagePaths('p1').get('w')).toBeDefined();
    cache.pagePaths('p5');
    expect(cache.pagePaths('p1').get('w')).toBeDefined();
    expect(cache.pagePaths('p2').size).toBe(0);
  });
});

describe('recordZoomPicture', () => {
  it('draws each unit on its own, under its own matrix, so overlaps paint as a union', () => {
    resetSkiaCalls();
    const a = { id: 1 } as unknown as import('@shopify/react-native-skia').SkPath;
    const b = { id: 2 } as unknown as import('@shopify/react-native-skia').SkPath;
    recordZoomPicture(
      [
        { matrix: [1, 0, 0, 1, 5, 6], path: a },
        { matrix: [2, 0, 0, 2, 0, 0], path: b },
      ],
      172.5,
      275,
      'ink',
    );
    expect(skiaCalls.filter((call) => ['save', 'concat', 'drawPath', 'restore'].includes(call.op)).map((call) => call.op)).toEqual([
      'save',
      'concat',
      'drawPath',
      'restore',
      'save',
      'concat',
      'drawPath',
      'restore',
    ]);
    expect(skiaCalls.filter((call) => call.op === 'concat').map((call) => call.matrix)).toEqual([
      toSkMatrix([1, 0, 0, 1, 5, 6]),
      toSkMatrix([2, 0, 0, 2, 0, 0]),
    ]);
  });
});

describe('buildRunsPath', () => {
  it('builds the absolute commands of the runs at the 1/32 scale (FIXTURE — not artwork)', () => {
    resetSkiaCalls();
    const decoded = decodeTqp(goldenBlob('basic'));
    const table = splitSubpaths(decoded);
    buildRunsPath(decoded, table, [{ count: 1, first: 1 }]);
    const ops2 = skiaCalls.map((call) => call.op);
    // Subpath 1 of the basic page: M L L Z in the reference ints; its first move is absolute (416, 16816).
    expect(skiaCalls.find((call) => call.op === 'moveTo')).toEqual({ op: 'moveTo', x: 416, y: 16816 });
    expect(ops2).toContain('quadTo');
    const adds = skiaCalls.filter((call) => call.op === 'addPath');
    expect(adds.at(-1)!.matrix).toEqual(toSkMatrix([1 / 32, 0, 0, 1 / 32, 0, 0]));
  });

  it('uses a tqpBlobFor page too (a synthetic move, line and close)', () => {
    const decoded = decodeTqp(tqpBlobFor([0, 1, 4], [3, 4, 5, 0]));
    const table = splitSubpaths(decoded);
    resetSkiaCalls();
    buildRunsPath(decoded, table, [{ count: 1, first: 0 }]);
    expect(skiaCalls.find((call) => call.op === 'moveTo')).toEqual({ op: 'moveTo', x: 3, y: 4 });
    expect(skiaCalls.find((call) => call.op === 'lineTo')).toEqual({ op: 'lineTo', x: 8, y: 4 });
    expect(skiaCalls.some((call) => call.op === 'close')).toBe(true);
  });
});
