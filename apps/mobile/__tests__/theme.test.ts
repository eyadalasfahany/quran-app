import { colors, shadows, themeNames, typeScale } from '@quran/design-tokens';

import { themes, uiFonts } from '@/core/theme';

describe('design tokens', () => {
  it.each(themeNames)('gives %s the same color and shadow keys as light', (name) => {
    expect(Object.keys(colors[name]).sort()).toEqual(Object.keys(colors.light).sort());
    expect(Object.keys(shadows[name]).sort()).toEqual(Object.keys(shadows.light).sort());
  });

  it.each(themeNames)('resolves every %s color to a literal value', (name) => {
    for (const value of Object.values(colors[name])) {
      expect(value).toMatch(/^(#[0-9a-f]{6}|rgba\(\d+, \d+, \d+, [\d.]+\))$/);
    }
  });
});

describe('theme', () => {
  const uiTokens = Object.entries(typeScale)
    .filter(([, style]) => style.family === 'ui')
    .map(([token]) => token);

  it('builds a text style for every interface type token', () => {
    expect(Object.keys(themes.light.text).sort()).toEqual(uiTokens.sort());
  });

  it('uses only loaded font families and never sets fontWeight', () => {
    for (const style of Object.values(themes.light.text)) {
      expect(Object.keys(uiFonts)).toContain(style.fontFamily);
      expect(style.fontWeight).toBeUndefined();
    }
  });

  it.each(themeNames)('takes %s colors from the tokens', (name) => {
    expect(themes[name].colors).toBe(colors[name]);
    expect(themes[name].shadows).toBe(shadows[name]);
  });
});
