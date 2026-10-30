import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { KhatmaProgressGrid } from './KhatmaProgressGrid';

describe('KhatmaProgressGrid', () => {
  it('draws the progress header and footnote from the Khatma frame', async () => {
    const view = await renderUi(
      <KhatmaProgressGrid
        dayIndex={12}
        durationDays={30}
        loggedDates={new Set(['2026-01-01', '2026-01-02'])}
        startDate="2026-01-01"
        today="2026-01-03"
      />,
    );

    expect(view.getByText('التقدّم')).toBeOnTheScreen();
    expect(view.getByText('اليوم ١٢')).toBeOnTheScreen();
    expect(view.getByText(/لا عدّاد انقطاع/)).toBeOnTheScreen();
    expect(view.getByTestId('khatma-progress-grid')).toBeOnTheScreen();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(
      <KhatmaProgressGrid dayIndex={1} durationDays={7} loggedDates={new Set()} startDate="2026-01-01" today="2026-01-01" />,
      { locale },
    );
    expect(view.getByTestId('khatma-progress-grid')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/khatma/components/KhatmaProgressGrid.tsx')).toEqual([]);
  });
});
