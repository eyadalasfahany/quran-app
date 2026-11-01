import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { maxFontScale } from './textStyles';
import { UiText } from './UiText';

const colors = themes.light.colors;

describe('UiText', () => {
  it('renders body text in ink with its Dynamic Type style by default', async () => {
    const view = await renderUi(<UiText>نص</UiText>);
    const text = view.getByText('نص');

    expect(flatStyle(text.props.style)).toMatchObject({ ...themes.light.text.body, color: colors.ink });
    expect(text.props.dynamicTypeRamp).toBe('body');
    expect(text.props.maxFontSizeMultiplier).toBe(maxFontScale.content);
    expect(flatStyle(text.props.style).fontWeight).toBeUndefined();
  });

  it.each([
    ['muted', colors.inkMuted],
    ['brand', colors.brand],
    ['danger', colors.danger],
    ['onBrand', colors.onBrand],
    ['onBrandSurface', colors.onBrandSurface],
    ['onBrandMuted', colors.onBrandSurfaceMuted],
    ['goldInk', colors.goldInk],
  ] as const)('draws the %s tone', async (tone, color) => {
    const view = await renderUi(<UiText tone={tone}>نص</UiText>);

    expect(flatStyle(view.getByText('نص').props.style).color).toBe(color);
  });

  it('picks the font file for a weight override instead of setting fontWeight', async () => {
    const view = await renderUi(
      <UiText variant="caption" weight={600}>
        نص
      </UiText>,
    );
    const style = flatStyle(view.getByText('نص').props.style);

    expect(style).toMatchObject({ fontFamily: 'IBMPlexSansArabic-SemiBold', fontSize: 13, lineHeight: 18 });
    expect(style.fontWeight).toBeUndefined();
  });

  it('renders display styles in Amiri without a Dynamic Type ramp', async () => {
    const view = await renderUi(<UiText variant="displaySm">الفاتحة</UiText>);
    const text = view.getByText('الفاتحة');

    expect(flatStyle(text.props.style)).toMatchObject({ fontFamily: 'Amiri-Bold', fontSize: 20, lineHeight: 26 });
    expect(text.props.dynamicTypeRamp).toBeUndefined();
  });

  it('caps growth on floating bars', async () => {
    const view = await renderUi(<UiText scale="bar">نص</UiText>);

    expect(view.getByText('نص').props.maxFontSizeMultiplier).toBe(maxFontScale.bar);
  });

  it('passes the accessibility role through', async () => {
    const view = await renderUi(<UiText accessibilityRole="header">العنوان</UiText>);

    expect(view.getByRole('header', { name: 'العنوان' })).toBeOnTheScreen();
  });

  it.each(locales)('aligns as asked in %s', async (locale) => {
    const view = await renderUi(<UiText align="center">نص</UiText>, { locale });

    expect(flatStyle(view.getByText('نص').props.style).textAlign).toBe('center');
  });

  it('follows Increase Contrast through the muted tone', async () => {
    const view = await renderUi(<UiText tone="muted">نص</UiText>, { theme: 'dark' });

    expect(flatStyle(view.getByText('نص').props.style).color).toBe(themes.dark.colors.inkMuted);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('UiText.tsx')).toEqual([]);
  });
});
