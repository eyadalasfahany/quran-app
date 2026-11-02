import { renderUi } from '../../../../jest/render-ui';

import { MoonPhaseDisc } from './MoonPhaseDisc';

describe('MoonPhaseDisc', () => {
  it('renders the SVG disc', async () => {
    const view = await renderUi(<MoonPhaseDisc illumination={0.2} waxing />);
    expect(view.getByTestId('moon-phase-disc')).toBeOnTheScreen();
  });
});
