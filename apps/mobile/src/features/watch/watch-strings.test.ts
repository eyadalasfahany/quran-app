import fs from 'node:fs';
import path from 'node:path';

const WATCH_DIR = path.join(__dirname, '../../../targets/watch');

const REQUIRED_KEYS = [
  'watch_remaining',
  'watch_today_progress',
  'watch_no_data_title',
  'watch_no_data_body',
  'watch_stale_title',
  'watch_stale_body',
  'watch_azkar_today',
  'watch_azkar_done',
  'watch_of',
  'watch_round',
  'watch_target_reached',
  'watch_target',
  'watch_custom',
  'watch_today_total',
  'watch_awaiting_sync',
  'watch_reset',
  'watch_reset_confirm',
  'watch_cancel',
  'watch_no_target',
  'watch_count_hint',
  'watch_confirm',
];

const WATCH_FONTS = [
  'Amiri-Bold.ttf',
  'IBMPlexSansArabic-Regular.ttf',
  'IBMPlexSansArabic-SemiBold.ttf',
  'IBMPlexSansArabic-Bold.ttf',
];

function keysOf(file: string): string[] {
  const text = fs.readFileSync(path.join(WATCH_DIR, file), 'utf8');
  return [...text.matchAll(/^"([^"]+)"\s*=\s*"/gm)].map((match) => match[1] ?? '');
}

describe('watch Localizable.strings', () => {
  it.each(['ar', 'en'])('%s.lproj declares every watch_* key once', (language) => {
    const keys = keysOf(`${language}.lproj/Localizable.strings`);
    expect([...keys].sort()).toEqual([...REQUIRED_KEYS].sort());
  });

  it('keeps the Arabic and English key sets identical', () => {
    expect(keysOf('ar.lproj/Localizable.strings').sort()).toEqual(
      keysOf('en.lproj/Localizable.strings').sort(),
    );
  });
});

describe('watch fonts', () => {
  it('lists in Info.plist exactly the faces shipped in Fonts/', () => {
    const plist = fs.readFileSync(path.join(WATCH_DIR, 'Info.plist'), 'utf8');
    const listed = [...plist.matchAll(/<string>([^<]+\.ttf)<\/string>/g)].map((match) => match[1] ?? '');
    expect(listed.sort()).toEqual([...WATCH_FONTS].sort());
    for (const font of WATCH_FONTS) {
      expect(fs.existsSync(path.join(WATCH_DIR, 'Fonts', font))).toBe(true);
    }
  });
});
