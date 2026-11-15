import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { StageBands } from './StageBands';

const hidden = { includeHiddenElements: true } as const;

describe('StageBands', () => {
  it.each(locales)('names the four stages (%s)', async (locale) => {
    await renderUi(<StageBands />, { locale });
    const names = locale === 'ar' ? ['الطفولة', 'الصبا', 'الشباب', 'الكهولة'] : ['Childhood', 'Teens', 'Youth', 'Maturity'];
    names.forEach((name) => expect(screen.getByText(name, hidden)).toBeOnTheScreen());
  });

  it('colours the bands with the highlight tokens', async () => {
    await renderUi(<StageBands testID="bands" />);
    const colours = ['childhood', 'adolescence', 'youth', 'maturity'].map(
      (key) => flatStyle(screen.getByTestId(`bands-${key}`, hidden).props.style).backgroundColor,
    );
    expect(colours).toEqual([
      themes.light.colors.highlightGold,
      themes.light.colors.highlightGreen,
      themes.light.colors.highlightBlue,
      themes.light.colors.highlightRose,
    ]);
  });

  it('sizes the bands by their years (12, 8, 20 and 24 of 64)', async () => {
    await renderUi(<StageBands testID="bands" />);
    const widths = ['childhood', 'adolescence', 'youth', 'maturity'].map(
      (key) => flatStyle(screen.getByTestId(`bands-${key}`, hidden).parent?.props.style).width,
    );
    expect(widths).toEqual(['18.75%', '12.5%', '31.25%', '37.5%']);
  });

  it('fades the other bands and stresses the active stage', async () => {
    await renderUi(<StageBands activeStage="maturity" testID="bands" />);
    expect(flatStyle(screen.getByTestId('bands-maturity', hidden).props.style).opacity).toBe(1);
    expect(flatStyle(screen.getByTestId('bands-childhood', hidden).props.style).opacity).toBeLessThan(1);
  });

  it('draws the vertical bar with bands down the axis', async () => {
    await renderUi(<StageBands orientation="vertical" testID="bands" />);
    const parent = screen.getByTestId('bands-childhood', hidden).parent?.props.style;
    expect(flatStyle(parent).height).toBe('18.75%');
  });

  it('is decorative and ignores touches', async () => {
    await renderUi(<StageBands testID="bands" />);
    const root = screen.getByTestId('bands', hidden);
    expect(root.props.accessibilityElementsHidden).toBe(true);
    expect(root.props.pointerEvents).toBe('none');
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/StageBands.tsx')).toEqual([]);
  });
});
