import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { CountDisc } from './CountDisc';

const hidden = { includeHiddenElements: true } as const;

describe('CountDisc', () => {
  it.each(locales)('shows the count in the language digits (%s)', async (locale) => {
    await renderUi(<CountDisc count={56} />, { locale });
    expect(screen.getByText(locale === 'ar' ? '٥٦' : '56', hidden)).toBeOnTheScreen();
  });

  it('is a 30 pt brand disc inside a 2 pt raised ring, the count at 13 (frame SeerahMapKey)', async () => {
    await renderUi(<CountDisc count={3} size={30} testID="disc" />);
    expect(flatStyle(screen.getByTestId('disc', hidden).props.style)).toMatchObject({
      backgroundColor: themes.light.colors.brand,
      borderColor: themes.light.colors.surfaceRaised,
      borderWidth: 2,
      height: 34,
      width: 34,
    });
    expect(flatStyle(screen.getByText('٣', hidden).props.style)).toMatchObject({ fontSize: 13 });
  });

  it.each(locales)('centres its digits on both axes, one or two of them (%s)', async (locale) => {
    for (const count of [4, 51]) {
      const view = await renderUi(<CountDisc count={count} testID="disc" />, { locale });
      expect(flatStyle(screen.getByTestId('disc', hidden).props.style)).toMatchObject({ alignItems: 'center', justifyContent: 'center' });
      const digits = screen.getByText(new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en').format(count), hidden);
      expect(flatStyle(digits.props.style)).toMatchObject({ includeFontPadding: false, paddingTop: 2, textAlign: 'center', textAlignVertical: 'center' });
      await view.unmount();
    }
  });

  it('is decorative: the control around it carries the label', async () => {
    await renderUi(<CountDisc count={3} testID="disc" />);
    expect(screen.getByTestId('disc', hidden).props.accessibilityElementsHidden).toBe(true);
  });

  it('keeps its digits scalable up to the bar limit', async () => {
    await renderUi(<CountDisc count={3} />);
    expect(screen.getByText('٣', hidden).props.maxFontSizeMultiplier).toBe(1.5);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderUi(<CountDisc count={3} testID="disc" />, { theme });
    expect(flatStyle(screen.getByTestId('disc', hidden).props.style).backgroundColor).toBe(themes[theme].colors.brand);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/CountDisc.tsx')).toEqual([]);
  });
});
