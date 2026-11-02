import { renderUi } from '../../../../jest/render-ui';

import { MoonTimeRow } from './MoonTimeRow';

describe('MoonTimeRow', () => {
  it('renders label and value', async () => {
    const view = await renderUi(<MoonTimeRow label="Sunset" testID="row" value="6:12 PM" />);
    expect(view.getByText('Sunset')).toBeOnTheScreen();
    expect(view.getByText('6:12 PM')).toBeOnTheScreen();
  });
});
