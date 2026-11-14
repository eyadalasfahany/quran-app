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

  it('is a brand disc of the given size, with a raised ring', async () => {
    await renderUi(<CountDisc count={3} size={30} testID="disc" />);
    expect(flatStyle(screen.getByTestId('disc', hidden).props.style)).toMatchObject({
      backgroundColor: themes.light.colors.brand,
      borderColor: themes.light.colors.surfaceRaised,
      height: 30,
      width: 30,
    });
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
