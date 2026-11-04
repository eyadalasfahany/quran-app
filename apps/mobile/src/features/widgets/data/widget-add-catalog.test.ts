import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { WIDGET_ADD_CATALOG } from './widget-add-catalog';

const SCREENS_HTML = join(process.cwd(), '..', '..', 'quran-app-screens.html');

describe('widget add catalog', () => {
  it('every row has a frame id present in quran-app-screens.html', () => {
    const html = readFileSync(SCREENS_HTML, 'utf8');
    for (const row of WIDGET_ADD_CATALOG) {
      expect(html).toContain(`id="${row.frameId}"`);
      expect(row.destinations.length).toBeGreaterThan(0);
    }
  });

  it('offers lock only for next prayer and progress on iOS kinds', () => {
    const lockRows = WIDGET_ADD_CATALOG.filter((row) => row.destinations.includes('lock'));
    expect(lockRows.map((row) => row.id).sort()).toEqual(['nextPrayer', 'progress']);
  });
});
