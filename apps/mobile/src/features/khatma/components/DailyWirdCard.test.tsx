import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { amiriNaturalLeading } from '@quran/design-tokens';
import { themes } from '@/core/theme';

import { DailyWirdCard } from './DailyWirdCard';

describe('DailyWirdCard', () => {
  it('draws the brand daily wird card from the Khatma frame', async () => {
    const view = await renderUi(<DailyWirdCard juzApprox={1} pagesPerDay={21} />);

    expect(view.getByText('وردك اليومي')).toBeOnTheScreen();
    expect(view.getByText('٢١ صفحة')).toBeOnTheScreen();
    expect(view.getByText('حوالي ١ جزء يوميًا')).toBeOnTheScreen();
    expect(view.getByTestId('khatma-daily-wird')).toBeOnTheScreen();
    expect(view.getByTestId('khatma-daily-wird').props.style).toMatchObject({
      backgroundColor: themes.light.colors.brandSurface,
    });
  });

  it.each(['light', 'dark'] as const)('draws the wird figure in the on-brand surface token in %s', async (theme) => {
    const view = await renderUi(<DailyWirdCard juzApprox={1} pagesPerDay={21} />, { theme });

    expect(flatStyle(view.getByText('٢١ صفحة').props.style).color).toBe(themes[theme].colors.onBrandSurface);
    expect(flatStyle(view.getByText('وردك اليومي').props.style).color).toBe(themes[theme].colors.onBrandSurfaceMuted);
  });

  it('gives the wird figure a line height of at least Amiri natural leading', async () => {
    const view = await renderUi(<DailyWirdCard juzApprox={1} pagesPerDay={21} />);

    expect(flatStyle(view.getByText('٢١ صفحة').props.style).lineHeight).toBeGreaterThanOrEqual(Math.round(34 * amiriNaturalLeading));
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<DailyWirdCard juzApprox={1} pagesPerDay={21} />, { locale });
    expect(view.getByTestId('khatma-daily-wird')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/khatma/components/DailyWirdCard.tsx')).toEqual([]);
    expect(featureComponentLiterals('features/khatma/components/DailyWirdOrnament.tsx')).toEqual([]);
  });
});
