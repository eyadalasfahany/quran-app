import { renderUi } from '../../../../jest/render-ui';

import { MoonSummaryCard } from './MoonSummaryCard';

describe('MoonSummaryCard', () => {
  it('shows age and illumination', async () => {
    const view = await renderUi(
      <MoonSummaryCard ageLabel="1.2 days" illumination={0.05} illuminationLabel="5%" waxing />,
    );
    expect(view.getByText('1.2 days')).toBeOnTheScreen();
    expect(view.getByText('5%')).toBeOnTheScreen();
  });
});
