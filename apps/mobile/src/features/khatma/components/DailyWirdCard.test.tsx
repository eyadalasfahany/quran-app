import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
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

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<DailyWirdCard juzApprox={1} pagesPerDay={21} />, { locale });
    expect(view.getByTestId('khatma-daily-wird')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/khatma/components/DailyWirdCard.tsx')).toEqual([]);
    expect(featureComponentLiterals('features/khatma/components/DailyWirdOrnament.tsx')).toEqual([]);
  });
});
