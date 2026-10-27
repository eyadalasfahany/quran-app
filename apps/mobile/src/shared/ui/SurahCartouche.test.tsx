import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { SurahCartouche } from './SurahCartouche';

describe('SurahCartouche', () => {
  it('renders the name as a header in Amiri Bold', async () => {
    const view = await renderUi(<SurahCartouche name="سورة الفاتحة" />);
    const name = flatStyle(view.getByText('سورة الفاتحة').props.style);

    expect(view.getByRole('header', { name: 'سورة الفاتحة' })).toBeOnTheScreen();
    expect(name).toMatchObject({ color: themes.light.colors.ink, fontFamily: 'Amiri-Bold' });
    expect(name.fontWeight).toBeUndefined();
  });

  it.each(['light', 'sepia', 'dark'] as const)('draws a double gold frame in %s', async (theme) => {
    const view = await renderUi(<SurahCartouche name="سورة البقرة" testID="banner" />, { theme });

    expect(flatStyle(view.getByTestId('banner').props.style).borderColor).toBe(themes[theme].colors.gold);
    expect(flatStyle(view.getByTestId('banner-inner').props.style).borderColor).toBe(themes[theme].colors.gold);
  });

  it('draws the band frame: hairline outer ring and a thinner inner ring', async () => {
    const view = await renderUi(<SurahCartouche name="سورة البقرة" testID="banner" />);
    const { size, stroke } = themes.light;

    expect(flatStyle(view.getByTestId('banner').props.style)).toMatchObject({
      borderRadius: size.bandRadius,
      borderWidth: stroke.hairline,
      padding: size.bandInset,
    });
    expect(flatStyle(view.getByTestId('banner-inner').props.style)).toMatchObject({
      borderRadius: size.bandInnerRadius,
      borderWidth: stroke.frameInner,
      minHeight: 44,
    });
  });

  it.each(locales)('centres the name right to left in %s', async (locale) => {
    const view = await renderUi(<SurahCartouche name="سورة الفاتحة" />, { locale });

    expect(flatStyle(view.getByText('سورة الفاتحة').props.style)).toMatchObject({
      textAlign: 'center',
      writingDirection: 'rtl',
    });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('SurahCartouche.tsx')).toEqual([]);
  });
});
