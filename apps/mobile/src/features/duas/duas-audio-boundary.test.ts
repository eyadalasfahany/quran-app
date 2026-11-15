import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src/features/duas');
const AZKAR_INDEX = join(process.cwd(), 'src/features/azkar/index.ts');

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

/** Every module specifier a file imports or re-exports from. */
function importSpecifiers(text: string): string[] {
  const specifiers: string[] = [];
  const pattern = /(?:import|export)\s[^'";]*?from\s+'([^']+)'|import\s+'([^']+)'/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    specifiers.push(match[1] ?? match[2] ?? '');
  }
  return specifiers;
}

/**
 * ADR 0092 decision 3 (amends ADR 0055 §1): a Hisn dua plays its recording through the public `features/azkar` API. Duas
 * never names `azkarPlayerStore` and never imports the Azkar audio modules; the only audio door is `@/features/azkar`.
 */
describe('duas audio boundary', () => {
  it('imports Azkar audio only through the public features/azkar API', () => {
    const hits: string[] = [];

    for (const file of walk(ROOT)) {
      const text = readFileSync(file, 'utf8');
      for (const specifier of importSpecifiers(text)) {
        const reachesAudio = specifier.includes('azkarPlayerStore') || /features\/azkar\/audio(\/|$)/.test(specifier);
        if (reachesAudio) {
          hits.push(`${file}: ${specifier}`);
        }
      }
    }

    expect(hits).toEqual([]);
  });

  it('never names the Azkar player store in Duas code', () => {
    const hits = walk(ROOT).filter((file) => readFileSync(file, 'utf8').includes('azkarPlayerStore'));

    expect(hits).toEqual([]);
  });

  it('exposes the playback surface Duas uses from the features/azkar index', () => {
    const index = readFileSync(AZKAR_INDEX, 'utf8');

    for (const name of ['useAzkarEntryPlayback', 'AzkarPlayerBar', 'AzkarPlayerControl', 'AzkarDownloadButton', 'AzkarOfflinePill']) {
      expect(index).toContain(name);
    }
  });

  it('routes the Duas audio imports through @/features/azkar only', () => {
    const duasAudioUsers = walk(ROOT).filter((file) => /useAzkarEntryPlayback|AzkarPlayerBar|AzkarDownloadButton|AzkarPlayerControl/.test(readFileSync(file, 'utf8')));
    const specifiers = duasAudioUsers.flatMap((file) => importSpecifiers(readFileSync(file, 'utf8')));

    expect(duasAudioUsers.length).toBeGreaterThan(0);
    expect(specifiers.filter((specifier) => /features\/azkar/.test(specifier) && /Player|Download|Playback/.test(specifier))).toEqual([]);
  });
});

/**
 * ADR 0092 decision 3: a Quranic dua's play goes through the Quran player's public surface only. Duas never imports the
 * player's store or the player module. It imports from the audio feature only the range hook (its play state and tap),
 * and the player's shared reader bar and error notice (the same bar and copy the reader uses).
 */
describe('duas Quran player boundary', () => {
  const ALLOWED = [
    'features/audio/hooks/useRangePlayback',
    'features/audio/components/MiniPlayer',
    'features/audio/components/PlayerErrorNotice',
  ];

  it('imports from the audio feature only through the allowed public modules', () => {
    const hits: string[] = [];

    for (const file of walk(ROOT)) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/from\s+['"]([^'"]*features\/audio\/[^'"]*)['"]/g)) {
        const specifier = match[1] ?? '';
        if (!ALLOWED.some((allowed) => specifier.endsWith(allowed))) {
          hits.push(`${file}: ${specifier}`);
        }
      }
    }

    expect(hits).toEqual([]);
  });

  it('never imports the Quran player module or its store', () => {
    const hits: string[] = [];

    for (const file of walk(ROOT)) {
      const text = readFileSync(file, 'utf8');
      if (/audio\/(player|playerStore)['"]/.test(text)) {
        hits.push(file);
      }
    }

    expect(hits).toEqual([]);
  });
});
