import { act, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { gzipSync } from 'fflate';
import { Text } from 'react-native';
import type { SvgMushafPackReader } from '@/core/mushaf-pack';
import { renderUi } from '../../../../jest/render-ui';
import { useMushafPageLoader, type MushafPageLoader } from './useMushafPageLoader';

jest.mock('@shopify/react-native-skia', () => jest.requireActual('../../../../jest/skia-mock'));

// A fake pack: placeholder pages and regions, no artwork.
const svg = (tag: string) =>
  `<svg viewBox="0 0 345 550"><g transform="matrix(1 0 0 -1 0 550)"><g id="content"><g transform="translate(0 0)"><path d="${tag}"/></g></g></g></svg>`;
const gz = (page: number) => gzipSync(new TextEncoder().encode(svg(`M ${page} 0 Z`)));

function fakeReader(missing: number[] = []): SvgMushafPackReader & { getPage: jest.Mock } {
  const getPage = jest.fn((page: number) => (missing.includes(page) ? new Uint8Array([1, 2, 3]) : gz(page)));
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
    reader.getPage.mockImplementation((page: number) => gz(page));
    await act(async () => loader!.retry(7));
    expect(loader!.error(7)).toBe(false);
    expect(loader!.model(7)).not.toBeNull();
  });

  it('shifts the regions and word boxes of a page with an offset viewBox to the zero origin', async () => {
    const offset = `<svg viewBox="-10 -20 345 550"><g transform="matrix(1 0 0 -1 0 550)"><g id="content"><g transform="translate(0 0)"><path d="M 0 0 Z"/></g></g></g></svg>`;
    const reader = {
      getPage: jest.fn(() => gzipSync(new TextEncoder().encode(offset))),
      regionsForPage: () => [{ ayah: 1, labelX: 15, labelY: 25, polygon: 'M 10 20 L 14 20 L 14 22 Z', surah: 1 }],
      wordBoxesForPage: () => [{ ayah: 1, line: 1, position: 1, surah: 1, x0: 10, x1: 14, y0: 20, y1: 22 }],
    } as unknown as SvgMushafPackReader;
    await renderUi(<Probe reader={reader} />);
    expect(loader!.regions(1)[0]!.bounds).toEqual({ x0: 20, x1: 24, y0: 40, y1: 42 });
    expect(loader!.wordBoxes(1)).toEqual([{ ayah: 1, line: 1, position: 1, surah: 1, x0: 20, x1: 24, y0: 40, y1: 42 }]);
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
