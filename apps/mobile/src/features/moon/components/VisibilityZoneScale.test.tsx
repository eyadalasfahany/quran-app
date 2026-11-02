import { renderUi } from '../../../../jest/render-ui';

import { VisibilityZoneScale } from './VisibilityZoneScale';

describe('VisibilityZoneScale', () => {
  it('marks zone B selected', async () => {
    const view = await renderUi(<VisibilityZoneScale active="B" />);
    expect(view.getByTestId('moon-zone-scale-B')).toBeOnTheScreen();
  });
});
