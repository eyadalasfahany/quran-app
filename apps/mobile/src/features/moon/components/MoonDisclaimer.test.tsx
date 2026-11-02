import { renderUi } from '../../../../jest/render-ui';

import { MoonDisclaimer } from './MoonDisclaimer';

describe('MoonDisclaimer', () => {
  it('shows the disclaimer placeholder', async () => {
    const view = await renderUi(<MoonDisclaimer />);
    expect(view.getByText(/TODO-REVIEW/)).toBeOnTheScreen();
  });
});
