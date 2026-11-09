import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { resetWindowSize, setWindowSize } from '../../../jest/window-size';
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

  // 'left' is the start edge (React Native flips it under RTL), so alignment never waits for a cold start.
  it.each(locales)('aligns to the start edge by default in %s', async (locale) => {
    const view = await renderUi(<UiText>نص</UiText>, { locale });

    expect(flatStyle(view.getByText('نص').props.style).textAlign).toBe('left');
  });

  it('lets a style override the default alignment', async () => {
    const view = await renderUi(<UiText style={{ textAlign: 'right' }}>نص</UiText>);

    expect(flatStyle(view.getByText('نص').props.style).textAlign).toBe('right');
  });

  it('follows Increase Contrast through the muted tone', async () => {
    const view = await renderUi(<UiText tone="muted">نص</UiText>, { theme: 'dark' });

    expect(flatStyle(view.getByText('نص').props.style).color).toBe(themes.dark.colors.inkMuted);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('UiText.tsx')).toEqual([]);
  });

  describe('window text scale (ADR 0043)', () => {
    afterEach(() => {
      resetWindowSize();
    });

    it('scales the body token in a 440 x 956 window', async () => {
      setWindowSize(440, 956);
      const view = await renderUi(<UiText>نص</UiText>);

      expect(flatStyle(view.getByText('نص').props.style)).toMatchObject({ fontSize: 19.2, lineHeight: 29 });
    });

    it('scales an override style once, in the same window', async () => {
      setWindowSize(440, 956);
      const view = await renderUi(<UiText style={{ fontSize: 30, lineHeight: 40 }}>نص</UiText>);

      expect(flatStyle(view.getByText('نص').props.style)).toMatchObject({ fontSize: 33.9, lineHeight: 45 });
    });

    it('keeps the frame sizes in a 390 x 844 window', async () => {
      setWindowSize(390, 844);
      const view = await renderUi(<UiText>نص</UiText>);

      expect(flatStyle(view.getByText('نص').props.style)).toMatchObject({ fontSize: 17, lineHeight: 26 });
    });
  });

  describe('Amiri line box (iOS clip)', () => {
    afterEach(() => {
      resetWindowSize();
    });

    it('pads a display style below Amiri natural leading and keeps its layout', async () => {
      const view = await renderUi(<UiText variant="displaySm">نص</UiText>);
      const style = flatStyle(view.getByText('نص').props.style);

      expect(style).toMatchObject({ paddingTop: 5, paddingBottom: 5, marginTop: -5, marginBottom: -5, lineHeight: 26 });
    });

    it('adds the pad to the caller padding', async () => {
      const view = await renderUi(<UiText variant="displaySm" style={{ paddingTop: 8 }}>نص</UiText>);
      const style = flatStyle(view.getByText('نص').props.style);

      expect(style).toMatchObject({ paddingTop: 13, paddingBottom: 5, marginTop: -5, marginBottom: -5 });
    });

    it('adds no padding or margin to a ui style', async () => {
      const view = await renderUi(<UiText variant="body">نص</UiText>);
      const style = flatStyle(view.getByText('نص').props.style);

      expect(style.paddingTop).toBeUndefined();
      expect(style.marginTop).toBeUndefined();
    });

    it('adds nothing when the line height already reaches the natural leading', async () => {
      const view = await renderUi(<UiText variant="displayLg" style={{ lineHeight: 60 }}>نص</UiText>);
      const style = flatStyle(view.getByText('نص').props.style);

      expect(style.paddingTop).toBeUndefined();
      expect(style.marginTop).toBeUndefined();
    });
  });
});
