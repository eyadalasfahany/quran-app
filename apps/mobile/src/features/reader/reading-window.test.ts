import { openReaderTestContent } from '../../../jest/reader-test-db';
import { buildReadingRows, shouldShowBismillahRow } from './reading-window';

describe('reading window rows', () => {
  it('includes Bismillah before 2:1 but not 1:1 or 9:1', async () => {
    const { executor } = await openReaderTestContent();
    const fatihaStart = buildReadingRows(executor, 1, 1, [], new Map());
    const tawbahStart = buildReadingRows(executor, 1239, 1239, [], new Map());
    const cowStart = buildReadingRows(executor, 8, 8, [], new Map());

    expect(fatihaStart.some((row) => row.type === 'bismillah')).toBe(false);
    expect(tawbahStart.some((row) => row.type === 'bismillah')).toBe(false);
    expect(cowStart.some((row) => row.type === 'bismillah')).toBe(true);
  });

  it('matches chapter bismillah_pre rules', async () => {
    const { executor } = await openReaderTestContent();
    expect(shouldShowBismillahRow(2, 1, 1)).toBe(true);
    expect(shouldShowBismillahRow(1, 1, 0)).toBe(false);
    expect(shouldShowBismillahRow(9, 1, 0)).toBe(false);
    expect(shouldShowBismillahRow(2, 2, 1)).toBe(false);

    const cow = buildReadingRows(executor, 8, 10, [], new Map());
    const bismillah = cow.find((row) => row.type === 'bismillah');
    expect(bismillah?.type).toBe('bismillah');
  });
});
