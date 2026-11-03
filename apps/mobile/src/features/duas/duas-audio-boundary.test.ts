import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src/features/duas');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(path);
    }
    if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) {
      return [];
    }
    return [path];
  });
}

/** ADR 0055: Duas never imports the Azkar player store. */
describe('duas audio boundary', () => {
  it('does not reference azkarPlayerStore under features/duas', () => {
    const hits: string[] = [];

    for (const file of walk(ROOT)) {
      const text = readFileSync(file, 'utf8');
      if (text.includes('azkarPlayerStore')) {
        hits.push(file);
      }
    }

    expect(hits).toEqual([]);
  });
});
