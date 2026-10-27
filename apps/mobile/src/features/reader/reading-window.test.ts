import { openReaderTestContent } from '../../../jest/reader-test-db';
import { anchorRowIndex, buildReadingRows, shouldShowBismillahRow } from './reading-window';

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

  it('opens a surah at its header, so its title and bismillah show, and any other ayah at its own row', async () => {
    const { executor } = await openReaderTestContent();
    // Verse ids 1–20: al-Fatihah (1–7) and the start of al-Baqarah (8–20).
    const rows = buildReadingRows(executor, 1, 20, [], new Map());

    const baqarah = anchorRowIndex(rows, '2:1');
    expect(rows[baqarah]).toMatchObject({ type: 'surah-header', chapter: { id: 2 } });

    const ayah = anchorRowIndex(rows, '2:3');
    expect(rows[ayah]).toMatchObject({ type: 'ayah', verse: { verseKey: '2:3' } });

    expect(anchorRowIndex(rows, '50:1')).toBe(-1);
  });
});
