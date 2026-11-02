import { renderUi } from '../../../../jest/render-ui';

import { VisibilityZonePill } from './VisibilityZonePill';

describe('VisibilityZonePill', () => {
  it('shows the zone name with its Arabic letter', async () => {
    const view = await renderUi(<VisibilityZonePill zone="D" testID="pill" />);
    expect(view.getByText('المنطقة د')).toBeOnTheScreen();
    expect(view.getByTestId('pill')).toBeOnTheScreen();
  });

  it('shows the zone name in English', async () => {
    const view = await renderUi(<VisibilityZonePill zone="B" />, { locale: 'en' });
    expect(view.getByText('Zone B')).toBeOnTheScreen();
  });
});
