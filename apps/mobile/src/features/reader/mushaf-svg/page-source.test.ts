import type { SvgMushafPackReader } from '@/core/mushaf-pack';

import { goldenBlob } from './__fixtures__/tqp/blob';
import { loadPageModel, MushafPageMissingError, PageModelCache } from './page-source';
import { TqpDecodeError } from './tqp-decoder';
import type { SvgPageModel } from './svg-page-model';

// Synthetic goldens only (FIXTURE — not artwork).

function modelOf(tag: string): SvgPageModel {
  return { origin: { x: 0, y: 0 }, pieces: [{ d: tag, matrix: [1, 0, 0, 1, 0, 0] }], viewBox: { height: 550, width: 345 } };
}

const ZERO = { x: 0, y: 0 };

function readerWith(pages: Record<number, Uint8Array>, origin = ZERO): SvgMushafPackReader & { getPage: jest.Mock } {
  return { getPage: jest.fn((page: number) => (pages[page] === undefined ? null : { blob: pages[page], origin })) } as unknown as SvgMushafPackReader & {
    getPage: jest.Mock;
  };
}

describe('loadPageModel', () => {
  it('decodes a TQP1 page into its commands (no SVG string), then answers from the cache without reading the pack again', () => {
    const reader = readerWith({ 1: goldenBlob('basic') });
    const cache = new PageModelCache(8);
    const first = loadPageModel(reader, 'hafs:1', 1, cache);
    expect(first.pieces).toHaveLength(0);
    expect(first.decoded?.cmds.length).toBeGreaterThan(0);
    const second = loadPageModel(reader, 'hafs:1', 1, cache);
    expect(second).toBe(first);
    expect(reader.getPage).toHaveBeenCalledTimes(1);
  });

  it('carries the pack page origin into the model, so regions and word boxes can follow it', () => {
    const model = loadPageModel(readerWith({ 1: goldenBlob('basic') }, { x: -10.5, y: -20.25 }), 'hafs:1', 1, new PageModelCache(8));
    expect(model.origin).toEqual({ x: -10.5, y: -20.25 });
    expect(model.decoded).toBeDefined();
  });

  it('throws MushafPageMissingError for a page the pack does not have', () => {
    expect(() => loadPageModel(readerWith({}), 'hafs:9', 9, new PageModelCache(8))).toThrow(MushafPageMissingError);
  });

  it('throws TqpDecodeError for a corrupt page', () => {
    expect(() => loadPageModel(readerWith({ 1: new Uint8Array([9, 9, 9]) }), 'hafs:1', 1, new PageModelCache(8))).toThrow(
      TqpDecodeError,
    );
  });
});

describe('PageModelCache', () => {
  it('evicts the least recently used entry, and a hit makes an entry the newest', () => {
    const cache = new PageModelCache(2);
    cache.set('a', modelOf('a'));
    cache.set('b', modelOf('b'));
    expect(cache.get('a')).toBeDefined();
    cache.set('c', modelOf('c'));
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBeDefined();
    expect(cache.get('c')).toBeDefined();
  });

  it('clears everything', () => {
    const cache = new PageModelCache(2);
    cache.set('a', modelOf('a'));
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
  });
});
