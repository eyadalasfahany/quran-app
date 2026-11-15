import type { SvgMushafPackReader } from '@/core/mushaf-pack';
import { gzipSync } from 'fflate';

import { inflatePage, loadPageModel, MushafPageMissingError, PageModelCache } from './page-source';
import type { SvgPageModel } from './svg-page-model';

// A tiny synthetic page with placeholder paths; never artwork.
const SVG =
  '<svg viewBox="0 0 345 550"><g transform="matrix(1 0 0 -1 0 550)">' +
  '<g id="content"><g transform="translate(1 2)"><path d="M 0 0 L 1 0 L 1 1 Z"/></g></g></g></svg>';

const gz = (text: string) => gzipSync(new TextEncoder().encode(text));

function modelOf(tag: string): SvgPageModel {
  return { origin: { x: 0, y: 0 }, pieces: [{ d: tag, matrix: [1, 0, 0, 1, 0, 0] }], viewBox: { height: 550, width: 345 } };
}

function readerWith(pages: Record<number, Uint8Array>): SvgMushafPackReader & { getPage: jest.Mock } {
  return { getPage: jest.fn((page: number) => pages[page] ?? null) } as unknown as SvgMushafPackReader & {
    getPage: jest.Mock;
  };
}

describe('inflatePage', () => {
  it('returns the text the page was stored as', () => {
    expect(inflatePage(gz(SVG))).toBe(SVG);
  });

  it('throws on bad data', () => {
    expect(() => inflatePage(new Uint8Array([1, 2, 3, 4]))).toThrow();
  });
});

describe('loadPageModel', () => {
  it('inflates and parses a page, then answers from the cache without reading the pack again', () => {
    const reader = readerWith({ 1: gz(SVG) });
    const cache = new PageModelCache(8);
    const first = loadPageModel(reader, 'hafs:1:1', 1, cache);
    expect(first.pieces).toHaveLength(1);
    const second = loadPageModel(reader, 'hafs:1:1', 1, cache);
    expect(second).toBe(first);
    expect(reader.getPage).toHaveBeenCalledTimes(1);
  });

  it('throws MushafPageMissingError for a page the pack does not have', () => {
    expect(() => loadPageModel(readerWith({}), 'hafs:1:1', 9, new PageModelCache(8))).toThrow(MushafPageMissingError);
  });

  it('throws for a corrupt page', () => {
    expect(() => loadPageModel(readerWith({ 1: new Uint8Array([9, 9, 9]) }), 'hafs:1:1', 1, new PageModelCache(8))).toThrow();
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
