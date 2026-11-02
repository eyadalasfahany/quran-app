import { renderUi } from '../../../../jest/render-ui';

import { VisibilityEstimateCard } from './VisibilityEstimateCard';

describe('VisibilityEstimateCard', () => {
  it('always includes the disclaimer when an estimate is shown', async () => {
    const view = await renderUi(<VisibilityEstimateCard odehVLabel="+3.7°" zone="B" />);
    expect(view.getByTestId('moon-estimate-card-disclaimer')).toBeOnTheScreen();
  });
});
