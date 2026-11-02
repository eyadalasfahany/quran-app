import { renderUi } from '../../../../jest/render-ui';

import { VisibilityEstimateCard } from './VisibilityEstimateCard';

describe('VisibilityEstimateCard', () => {
  it('shows the Arabic estimate: title, zone, criterion, result and V', async () => {
    const view = await renderUi(<VisibilityEstimateCard odehVLabel="−٧٫٨" zone="D" />);
    expect(view.getByRole('header', { name: 'تقدير إمكان الرؤية' })).toBeOnTheScreen();
    expect(view.getByText('المنطقة د')).toBeOnTheScreen();
    expect(view.getByText('المعيار: عودة (Odeh) ٢٠٠٤')).toBeOnTheScreen();
    expect(view.getByText('غير ممكنة حتى بالمنظار')).toBeOnTheScreen();
    expect(view.getByText('قيمة V = −٧٫٨')).toBeOnTheScreen();
  });

  it('shows the English estimate for zone B with the Odeh result sentence', async () => {
    const view = await renderUi(<VisibilityEstimateCard odehVLabel="+1.2" zone="B" />, { locale: 'en' });
    expect(view.getByRole('header', { name: 'Visibility estimate' })).toBeOnTheScreen();
    expect(view.getByText('Zone B')).toBeOnTheScreen();
    expect(view.getByText('Criterion: Odeh (2004)')).toBeOnTheScreen();
    expect(view.getByText('Visible with optical aid; may be seen with the naked eye')).toBeOnTheScreen();
    expect(view.getByText('V = +1.2')).toBeOnTheScreen();
  });

  it('leaves the disclaimer to its own box below the card', async () => {
    const view = await renderUi(<VisibilityEstimateCard odehVLabel="−7.8" zone="D" />, { locale: 'en' });
    expect(view.queryByTestId('moon-estimate-card-disclaimer')).toBeNull();
    expect(view.getByTestId('moon-estimate-card-zone')).toBeOnTheScreen();
  });
});
