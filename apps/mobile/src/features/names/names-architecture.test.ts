import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src/features/names');

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

describe('names architecture', () => {
  it('does not import azkarPlayerStore or azkar audio hooks', () => {
    const forbidden = ['azkarPlayerStore', 'features/azkar/audio'];
    const hits: string[] = [];

    for (const file of walk(ROOT)) {
      const source = readFileSync(file, 'utf8');
      for (const needle of forbidden) {
        if (source.includes(needle)) {
          hits.push(`${file}: ${needle}`);
        }
      }
    }

    expect(hits).toEqual([]);
  });

  it('does not render audio control glyphs in feature UI', () => {
    const forbidden = ['play_arrow', 'play.circle', 'speaker', 'volume_up', 'headphones'];
    const hits: string[] = [];

    for (const file of walk(join(ROOT, 'components'))) {
      const source = readFileSync(file, 'utf8');
      for (const needle of forbidden) {
        if (source.includes(needle)) {
          hits.push(`${file}: ${needle}`);
        }
      }
    }

    expect(hits).toEqual([]);
  });
});
