import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { YearHistogram } from './YearHistogram';

const hidden = { includeHiddenElements: true } as const;

const heights = Array.from({ length: 64 }, (_, age) => (age === 10 ? 1 : age === 20 ? 0.5 : 0));

describe('YearHistogram', () => {
  it.each(locales)('draws 64 bars (%s)', async (locale) => {
    await renderUi(<YearHistogram heights={heights} testID="hist" />, { locale });
    expect(screen.getAllByTestId(/^hist-bar-/, hidden)).toHaveLength(64);
  });

  it('scales a bar by its year and leaves a hairline for a year without events', async () => {
    await renderUi(<YearHistogram heights={heights} testID="hist" thickness={40} />);
    expect(flatStyle(screen.getByTestId('hist-bar-10', hidden).props.style).height).toBe(40);
    // An empty year is a 2.5 pt stub; a year with events grows from it (frame SeerahMapRegion).
    expect(flatStyle(screen.getByTestId('hist-bar-20', hidden).props.style).height).toBe(2.5 + 0.5 * 37.5);
    expect(flatStyle(screen.getByTestId('hist-bar-0', hidden).props.style).height).toBe(2.5);
  });

  it('turns the focused bar brand and fades the rest', async () => {
    await renderUi(<YearHistogram focusAge={10} heights={heights} testID="hist" />);
    expect(flatStyle(screen.getByTestId('hist-bar-10', hidden).props.style)).toMatchObject({ backgroundColor: themes.light.colors.brand, opacity: 1 });
    expect(flatStyle(screen.getByTestId('hist-bar-20', hidden).props.style).opacity).toBe(0.16);
  });

  it('draws idle bars in brand at 42%', async () => {
    await renderUi(<YearHistogram heights={heights} testID="hist" />);
    expect(flatStyle(screen.getByTestId('hist-bar-20', hidden).props.style)).toMatchObject({ backgroundColor: themes.light.colors.brand, opacity: 0.42 });
  });

  it('grows bars along the cross axis when vertical', async () => {
    await renderUi(<YearHistogram heights={heights} orientation="vertical" testID="hist" thickness={40} />);
    expect(flatStyle(screen.getByTestId('hist-bar-10', hidden).props.style).width).toBe(40);
  });

  it('is decorative and ignores touches', async () => {
    await renderUi(<YearHistogram heights={heights} testID="hist" />);
    const root = screen.getByTestId('hist', hidden);
    expect(root.props.accessibilityElementsHidden).toBe(true);
    expect(root.props.pointerEvents).toBe('none');
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/YearHistogram.tsx')).toEqual([]);
  });
});
