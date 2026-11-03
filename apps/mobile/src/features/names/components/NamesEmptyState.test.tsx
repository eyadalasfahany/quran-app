import { renderUi } from '../../../../jest/render-ui';

import { NamesEmptyState } from './NamesEmptyState';

describe('NamesEmptyState', () => {
  it('renders empty copy', async () => {
    const view = await renderUi(<NamesEmptyState />);
    expect(view.getByTestId('names-empty')).toBeOnTheScreen();
  });
});
