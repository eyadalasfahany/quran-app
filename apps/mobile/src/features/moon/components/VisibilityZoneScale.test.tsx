import { renderUi } from '../../../../jest/render-ui';

import { VisibilityZoneScale } from './VisibilityZoneScale';

describe('VisibilityZoneScale', () => {
  it('marks zone B selected and shows the four letters in Arabic', async () => {
    const view = await renderUi(<VisibilityZoneScale active="B" />);
    expect(view.getByTestId('moon-zone-scale-B')).toBeOnTheScreen();
    expect(view.getByRole('tab', { name: 'ب', selected: true })).toBeOnTheScreen();
    expect(view.getByRole('tab', { name: 'أ', selected: false })).toBeOnTheScreen();
    for (const letter of ['أ', 'ب', 'ج', 'د']) {
      expect(view.getByText(letter)).toBeOnTheScreen();
    }
  });

  it('shows the four letters in English', async () => {
    const view = await renderUi(<VisibilityZoneScale active="D" />, { locale: 'en' });
    expect(view.getByRole('tab', { name: 'D', selected: true })).toBeOnTheScreen();
    for (const letter of ['A', 'B', 'C', 'D']) {
      expect(view.getByText(letter)).toBeOnTheScreen();
    }
  });

  it('exposes a tablist with four tabs', async () => {
    const view = await renderUi(<VisibilityZoneScale active="A" />);
    expect(view.getByTestId('moon-zone-scale')).toHaveProp('accessibilityRole', 'tablist');
    expect(view.getAllByRole('tab')).toHaveLength(4);
  });
});
