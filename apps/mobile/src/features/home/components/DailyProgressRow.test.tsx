import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { DailyProgressRow } from './DailyProgressRow';

describe('DailyProgressRow', () => {
  it('shows the goal and its count', async () => {
    const view = await renderUi(<DailyProgressRow done={false} label="وردك اليومي" value="٤ من ٢١ صفحة" />);

    expect(view.getByText('وردك اليومي')).toBeOnTheScreen();
    expect(view.getByText('٤ من ٢١ صفحة')).toBeOnTheScreen();
  });

  it('reads as one line with its state for a screen reader', async () => {
    const open = await renderUi(<DailyProgressRow done={false} label="المسبحة" value="٥٠ من ١٠٠" />);
    expect(open.getByLabelText('المسبحة, ٥٠ من ١٠٠').props.accessibilityState).toEqual({ checked: false });

    const done = await renderUi(<DailyProgressRow done label="أذكار الصباح" value="مكتمل" />);
    expect(done.getByLabelText('أذكار الصباح, مكتمل').props.accessibilityState).toEqual({ checked: true });
  });

  it('reads in English', async () => {
    const view = await renderUi(<DailyProgressRow done={false} label="Misbaha" value="50 of 100" />, { locale: 'en' });

    expect(view.getByLabelText('Misbaha, 50 of 100')).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/home/components/DailyProgressRow.tsx')).toEqual([]);
  });
});
