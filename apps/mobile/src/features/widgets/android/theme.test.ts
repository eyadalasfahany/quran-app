import { colors } from '@quran/design-tokens';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { paletteFor, withAlpha, type HexColor } from './theme';
import { WIDGET_FONTS } from './fonts';

describe('widget palette', () => {
  it('reads every colour from the design tokens, in light and dark', () => {
    const light = paletteFor('light');
    expect(light.brand).toBe(colors.light.brand);
    expect(light.surfaceRaised).toBe(colors.light.surfaceRaised);
    expect(paletteFor('dark').brand).toBe(colors.dark.brand);
  });

  it('gives only #rrggbb values', () => {
    for (const value of Object.values(paletteFor('dark'))) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('adds an alpha to a token colour', () => {
    expect(withAlpha('#ffffff' as HexColor, 0.5)).toBe('rgba(255, 255, 255, 0.5)');
  });
});

describe('widget fonts', () => {
  it('has a bundled file for every font name the widgets use', () => {
    const root = join(process.cwd(), 'assets', 'fonts');
    const files = [
      'IBMPlexSansArabic/IBMPlexSansArabic-Regular.ttf',
      'IBMPlexSansArabic/IBMPlexSansArabic-Medium.ttf',
      'IBMPlexSansArabic/IBMPlexSansArabic-SemiBold.ttf',
      'IBMPlexSansArabic/IBMPlexSansArabic-Bold.ttf',
      'Amiri/Amiri-Bold.ttf',
    ];
    for (const name of Object.values(WIDGET_FONTS)) {
      const match = files.find((file) => file.endsWith(`/${name}.ttf`));
      expect(match).toBeDefined();
      expect(readFileSync(join(root, match ?? ''))).toBeTruthy();
    }
  });
});
