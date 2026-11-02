import { renderUi } from '../../../../jest/render-ui';

import { MoonTimesCard } from './MoonTimesCard';

describe('MoonTimesCard', () => {
  it('lists time rows', async () => {
    const view = await renderUi(
      <MoonTimesCard rows={[{ key: 'sunset', label: 'Sunset', value: '6:00' }]} />,
    );
    expect(view.getByTestId('moon-times-card-sunset')).toBeOnTheScreen();
  });
});
