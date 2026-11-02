import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { themes } from '@/core/theme';

import { HijriNote } from './HijriNote';

describe('HijriNote', () => {
  it('renders the calculated-calendar note in the muted caption tone', async () => {
    const view = await renderUi(<HijriNote testID="note" text="التاريخ حسب تقويم أم القرى الحسابي" />);

    expect(view.getByText('التاريخ حسب تقويم أم القرى الحسابي')).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('note').props.style).color).toBe(themes.light.colors.inkMuted);
  });

  it('renders the English note', async () => {
    const view = await renderUi(<HijriNote text="Dates follow Umm al-Qura." />, { locale: 'en' });

    expect(view.getByText('Dates follow Umm al-Qura.')).toBeOnTheScreen();
  });
});
