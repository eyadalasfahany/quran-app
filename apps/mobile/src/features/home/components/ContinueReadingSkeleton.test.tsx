import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';

import { ContinueReadingSkeleton } from './ContinueReadingSkeleton';

const hidden = { includeHiddenElements: true } as const;
const colors = themes.light.colors;

describe('ContinueReadingSkeleton', () => {
  it('keeps the brand card’s surface, 24 pt radius and 22 pt padding', async () => {
    const view = await renderUi(<ContinueReadingSkeleton testID="card" />);

    expect(flatStyle(view.getByTestId('card', hidden).props.style)).toMatchObject({
      backgroundColor: colors.brandSurface,
      borderRadius: 24,
      padding: 22,
    });
  });

  it('draws the place, title and meta bars in onBrand, with the title bar at 58% by 26 on an 8 radius', async () => {
    const view = await renderUi(<ContinueReadingSkeleton testID="card" />);

    expect(flatStyle(view.getByTestId('card-place', hidden).props.style)).toMatchObject({ height: 10, width: '28%' });
    expect(flatStyle(view.getByTestId('card-title', hidden).props.style)).toMatchObject({ borderRadius: 8, height: 26, width: '58%' });
    expect(flatStyle(view.getByTestId('card-meta', hidden).props.style)).toMatchObject({ height: 10, width: '46%' });
    // The onBrand fill sits inside each bar at 20%.
    const fill = view.getByTestId('card-title', hidden).children[0] as unknown as { props: { style: unknown } };
    expect(flatStyle(fill.props.style)).toMatchObject({ backgroundColor: colors.onBrandSurface, opacity: 0.2 });
  });

  it('draws the progress track as a flexible 4 pt track beside a 72 by 36 pill on an 18 radius', async () => {
    const view = await renderUi(<ContinueReadingSkeleton testID="card" />);

    expect(flatStyle(view.getByTestId('card-track', hidden).props.style)).toMatchObject({ borderRadius: 2, height: 4 });
    expect(flatStyle(view.getByTestId('card-pill', hidden).props.style)).toMatchObject({ borderRadius: 18, height: 36, width: 72 });
  });

  it.each(locales)('lays out the same bars in %s', async (locale) => {
    const view = await renderUi(<ContinueReadingSkeleton testID="card" />, { locale });

    expect(flatStyle(view.getByTestId('card-title', hidden).props.style)).toMatchObject({ height: 26, width: '58%' });
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/home/components/ContinueReadingSkeleton.tsx')).toEqual([]);
  });
});
