import { fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../../jest/render-ui';
import { FontScaleStepper, PERCENT_MIN_WIDTH, STEP_GLYPH_LARGE, STEP_GLYPH_SMALL } from './FontScaleStepper';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

describe('FontScaleStepper', () => {
  beforeEach(() => {
    jest.mocked(Haptics.selectionAsync).mockClear();
  });

  it.each(locales)('shows an Arabic-Indic percentage in Arabic (%s)', async (locale) => {
    const view = await renderUi(<FontScaleStepper onChange={() => undefined} value={1} />, { locale });

    expect(view.getByTestId('reader-font-percent')).toHaveTextContent(locale === 'ar' ? '١٠٠٪' : '100%');
    // The glyphs come from i18n: the Arabic frame's «أ−» / «أ+», and the English «A−» / «A+» (en.json).
    expect(view.getByTestId('reader-font-decrease')).toHaveTextContent(locale === 'ar' ? 'أ−' : 'A−');
    expect(view.getByTestId('reader-font-increase')).toHaveTextContent(locale === 'ar' ? 'أ+' : 'A+');
    expect(view.getByLabelText(locale === 'ar' ? 'تصغير الخط' : 'Decrease text size')).toBeOnTheScreen();
    expect(view.getByLabelText(locale === 'ar' ? 'تكبير الخط' : 'Increase text size')).toBeOnTheScreen();
  });

  it('renders no headline title and no Quran preview', async () => {
    const view = await renderUi(<FontScaleStepper onChange={() => undefined} value={1} />);

    expect(view.queryByTestId('reader-font-preview')).toBeNull();
    expect(view.queryByText('حجم الخط')).toBeNull();
    expect(view.queryByText('حجم خط المصحف')).toBeNull();
  });

  it('draws the track in fillTrack with 2 pt padding and a 4 pt gap', async () => {
    const view = await renderUi(<FontScaleStepper onChange={() => undefined} value={1} />);

    expect(flatStyle(view.getByTestId('reader-font-scale').props.style)).toMatchObject({
      alignItems: 'center',
      backgroundColor: themes.light.colors.fillTrack,
      borderRadius: themes.light.radius.pill,
      flexDirection: 'row',
      gap: themes.light.space[1],
      padding: 2,
    });
  });

  it('steps by a tenth and does not call haptics', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<FontScaleStepper onChange={onChange} value={1} />);
    await fireEvent.press(view.getByTestId('reader-font-increase'));
    expect(onChange).toHaveBeenCalledWith(1.1);
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });

  it('steps down by a tenth', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<FontScaleStepper onChange={onChange} value={1} />);
    await fireEvent.press(view.getByTestId('reader-font-decrease'));
    expect(onChange).toHaveBeenCalledWith(0.9);
  });

  it('disables the ends of the range', async () => {
    const view = await renderUi(<FontScaleStepper onChange={() => undefined} value={0.8} />);
    expect(view.getByTestId('reader-font-decrease').props.accessibilityState).toEqual({ disabled: true });
    expect(view.getByTestId('reader-font-increase').props.accessibilityState).toEqual({ disabled: false });
  });

  it('draws 44 pt transparent round step buttons and dims the disabled end', async () => {
    const { size, opacity, radius } = themes.light;
    const view = await renderUi(<FontScaleStepper onChange={() => undefined} value={0.8} />);
    const decrease = flatStyle(view.getByTestId('reader-font-decrease').props.style);
    const increase = flatStyle(view.getByTestId('reader-font-increase').props.style);

    expect(increase).toMatchObject({
      backgroundColor: 'transparent',
      borderRadius: radius.pill,
      height: size.touchTarget,
      opacity: 1,
      width: size.touchTarget,
    });
    expect(decrease.opacity).toBe(opacity.disabled);
  });

  it('sets the glyphs in Amiri at the frame sizes, 16 and 20 pt', async () => {
    const view = await renderUi(<FontScaleStepper onChange={() => undefined} value={1} />);
    const small = flatStyle(view.getByText('أ−').props.style);
    const large = flatStyle(view.getByText('أ+').props.style);

    expect(STEP_GLYPH_SMALL).toBe(16);
    expect(STEP_GLYPH_LARGE).toBe(20);
    expect(small).toMatchObject({ fontFamily: 'Amiri-Regular', fontSize: 16, color: themes.light.colors.ink });
    expect(large).toMatchObject({ fontFamily: 'Amiri-Regular', fontSize: 20, color: themes.light.colors.ink });
  });

  it('sets the glyph lines at Amiri normal leading, so the hamza of أ is not clipped', async () => {
    const view = await renderUi(<FontScaleStepper onChange={() => undefined} value={1} />);

    // Amiri's hhea ascender 1124 + descender 634 per 1000 em: 16 pt → 28, 20 pt → 35.
    expect(flatStyle(view.getByText('أ−').props.style).lineHeight).toBe(28);
    expect(flatStyle(view.getByText('أ+').props.style).lineHeight).toBe(35);
  });

  it('uses the same hamza codepoint as the frame, U+0623 followed by U+2212 or +', async () => {
    const view = await renderUi(<FontScaleStepper onChange={() => undefined} value={1} />);

    expect(view.getByText('أ−').props.children).toBe('أ−');
    expect(view.getByText('أ+').props.children).toBe('أ+');
  });

  it('sets the percent at subhead size, semibold, with a 52 pt minimum width', async () => {
    const view = await renderUi(<FontScaleStepper onChange={() => undefined} value={1} />);
    const percent = flatStyle(view.getByTestId('reader-font-percent').props.style);

    expect(PERCENT_MIN_WIDTH).toBe(52);
    expect(percent).toMatchObject({
      fontFamily: 'IBMPlexSansArabic-SemiBold',
      fontSize: themes.light.text.subhead.fontSize,
      minWidth: 52,
      textAlign: 'center',
    });
  });

  it('pins the Arabic percent label to U+066A after the digits, set right to left', async () => {
    const view = await renderUi(<FontScaleStepper onChange={() => undefined} value={1} />, { locale: 'ar' });
    const percent = view.getByTestId('reader-font-percent');

    expect(percent.props.children).toBe('١٠٠٪');
    expect(flatStyle(percent.props.style).writingDirection).toBe('rtl');
  });

  it('keeps the English percent label left to right', async () => {
    const view = await renderUi(<FontScaleStepper onChange={() => undefined} value={1} />, { locale: 'en' });
    const percent = view.getByTestId('reader-font-percent');

    expect(percent.props.children).toBe('100%');
    expect(flatStyle(percent.props.style).writingDirection).toBe('ltr');
  });

  it.each(locales)('keeps the track and glyph order in %s', async (locale) => {
    const view = await renderUi(<FontScaleStepper onChange={() => undefined} value={1} />, { locale });

    expect(flatStyle(view.getByTestId('reader-font-scale').props.style).flexDirection).toBe('row');
    expect(view.getByTestId('reader-font-decrease')).toBeOnTheScreen();
    expect(view.getByTestId('reader-font-increase')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/settings/components/FontScaleStepper.tsx')).toEqual([]);
  });
});
