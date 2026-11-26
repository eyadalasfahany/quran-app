import { act, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';
import type { SvgMushafPackReader } from '@/core/mushaf-pack';
import { renderUi } from '../../../../jest/render-ui';
import { tqpBlobFor } from './__fixtures__/tqp/blob';
import { useMushafPageLoader, type MushafPageLoader } from './useMushafPageLoader';

jest.mock('@shopify/react-native-skia', () => jest.requireActual('../../../../jest/skia-mock'));

// A fake pack: placeholder pages (one moveto and a close each) and regions, no artwork.
const pageBlob = (page: number) => tqpBlobFor([0, 4], [page, 0]);

function fakeReader(missing: number[] = []): SvgMushafPackReader & { getPage: jest.Mock } {
  const getPage = jest.fn((page: number) => ({
    blob: missing.includes(page) ? new Uint8Array([1, 2, 3]) : pageBlob(page),
    origin: { x: 0, y: 0 },
  }));
  return {
    getPage,
    regionsForPage: (page: number) => [{ ayah: 1, labelX: 1, labelY: 1, polygon: `M 0 0 L ${page} 0 L ${page} 1 Z`, surah: 1 }],
    wordBoxesForPage: () => [],
  } as unknown as SvgMushafPackReader & { getPage: jest.Mock };
}

// Runs the queued idle tasks one at a time, the way the run loop would.
let tasks: (() => void)[] = [];
function runNextTask(): boolean {
  const task = tasks.shift();
  task?.();
  return task !== undefined;
}

let loader: MushafPageLoader | null = null;
function Probe({ reader }: { reader: SvgMushafPackReader }) {
  const value = useMushafPageLoader(reader, 'hafs');
  useEffect(() => {
    loader = value;
  });
  return <Text>{`v${value.version}`}</Text>;
}

beforeEach(() => {
  tasks = [];
  loader = null;
  // The idle slots are queued here and run by the test, one task at a time.
  globalThis.requestIdleCallback = ((task: () => void) => {
    tasks.push(task);
    return 0;
  }) as unknown as typeof requestIdleCallback;
});

describe('useMushafPageLoader', () => {
  it('loads one page per idle task, nearest first, and never twice', async () => {
    const reader = fakeReader();
    await renderUi(<Probe reader={reader} />);
    await act(async () => loader!.prefetch([50, 49, 51]));
    expect(tasks).toHaveLength(1);
    await act(async () => {
      runNextTask();
    });
    expect(loader!.model(50)).not.toBeNull();
    expect(loader!.model(49)).toBeNull();
    await act(async () => {
      runNextTask();
    });
    expect(loader!.model(49)).not.toBeNull();
    await act(async () => {
      runNextTask();
    });
    expect(loader!.model(51)).not.toBeNull();
    expect(reader.getPage).toHaveBeenCalledTimes(3);
    await act(async () => loader!.prefetch([50]));
    expect(tasks).toHaveLength(0);
  });

  it('records a page that cannot be read as an error, and retry clears it', async () => {
    const reader = fakeReader([7]);
    await renderUi(<Probe reader={reader} />);
    await act(async () => loader!.prefetch([7]));
    await act(async () => {
      runNextTask();
    });
    expect(loader!.error(7)).toBe(true);
    expect(loader!.model(7)).toBeNull();
    reader.getPage.mockImplementation((page: number) => ({ blob: pageBlob(page), origin: { x: 0, y: 0 } }));
    await act(async () => loader!.retry(7));
    expect(loader!.error(7)).toBe(false);
    expect(loader!.model(7)).not.toBeNull();
  });

  it('shifts the regions and word boxes of a page by the pack origin, so they follow the baked artwork', async () => {
    const reader = {
      getPage: jest.fn(() => ({ blob: tqpBlobFor([0, 4], [0, 0]), origin: { x: -10.5, y: -20.25 } })),
      regionsForPage: () => [{ ayah: 1, labelX: 15, labelY: 25, polygon: 'M 10 20 L 14 20 L 14 22 Z', surah: 1 }],
      wordBoxesForPage: () => [{ ayah: 1, line: 1, position: 1, surah: 1, x0: 10, x1: 14, y0: 20, y1: 22 }],
    } as unknown as SvgMushafPackReader;
    await renderUi(<Probe reader={reader} />);
    expect(loader!.regions(1)[0]!.bounds).toEqual({ x0: 20.5, x1: 24.5, y0: 40.25, y1: 42.25 });
    expect(loader!.wordBoxes(1)).toEqual([{ ayah: 1, line: 1, position: 1, surah: 1, x0: 20.5, x1: 24.5, y0: 40.25, y1: 42.25 }]);
  });

  it('gives the regions and word boxes of a page, read once', async () => {
    const reader = fakeReader();
    const spy = jest.spyOn(reader, 'regionsForPage');
    await renderUi(<Probe reader={reader} />);
    expect(loader!.regions(3)).toHaveLength(1);
    expect(loader!.regions(3)).toHaveLength(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/v/)).toBeTruthy();
  });
});

// A pack with word contours: one word and one title block, the page's origin set (FIXTURE — not artwork).
function contourReader(origin: { x: number; y: number }): SvgMushafPackReader {
  return {
    contourBlocksForPage: () => [{ ayah: 0, count: 1, first: 0, kind: 1, ord: 0, page: 1, surah: 0, x0: 0, x1: 40, y0: 0, y1: 10 }],
    getPage: () => ({ blob: tqpBlobFor([0, 1, 1, 4], [10, 10, 20, 0, 0, 20]), origin }),
    hasWordContours: true,
    regionsForPage: () => [{ ayah: 1, labelX: 1, labelY: 1, polygon: 'M 0 0 L 1 0 L 1 1 Z', surah: 1 }],
    wordBoxesForPage: () => [{ ayah: 1, line: 1, position: 1, surah: 1, x0: 0, x1: 40, y0: 20, y1: 56.3 }],
    wordContoursForPage: () => [{ ayah: 1, count: 1, first: 0, loose: false, position: 1, surah: 1 }],
  } as unknown as SvgMushafPackReader;
}

describe('useMushafPageLoader zoom', () => {
  it('lays a page out at a zoom above 1 and never at 1', async () => {
    await renderUi(<Probe reader={contourReader({ x: 0, y: 0 })} />);
    expect(loader!.layout(1, 1)).toBeNull();
    expect(loader!.layout(1, 2)).not.toBeNull();
    expect(loader!.layout(1, 2)!.unitsWidth).toBeCloseTo(172.5, 6);
  });

  it('shifts a block by the page origin, so it lands where the artwork draws it', async () => {
    await renderUi(<Probe reader={contourReader({ x: -10, y: -20 })} />);
    const layout = loader!.layout(1, 2)!;
    const block = layout.placed.find((item) => !('box' in item.unit) && !('surah' in item.unit))!;
    expect((block.unit as { bounds: unknown }).bounds).toEqual({ x0: 10, x1: 50, y0: 20, y1: 30 });
  });

  it('gives a pack without contour data no layout and no zoomed picture (the page stays at 100%)', async () => {
    await renderUi(<Probe reader={fakeReader()} />);
    expect(loader!.layout(1, 2)).toBeNull();
    expect(loader!.zoomedPicture(1, 2, 'ink')).toBeNull();
  });

  it('draws the zoomed picture of a page in one colour, cached per zoom', async () => {
    await renderUi(<Probe reader={contourReader({ x: 0, y: 0 })} />);
    const first = loader!.zoomedPicture(1, 2, 'ink');
    expect(first).not.toBeNull();
    expect(loader!.zoomedPicture(1, 2, 'ink')).toBe(first);
  });
});
