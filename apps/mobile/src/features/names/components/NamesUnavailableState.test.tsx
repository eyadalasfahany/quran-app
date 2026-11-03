import { renderUi } from '../../../../jest/render-ui';

import { NamesUnavailableState } from './NamesUnavailableState';

describe('NamesUnavailableState', () => {
  it('shows the unavailable copy in Arabic', async () => {
    const view = await renderUi(<NamesUnavailableState />);
    expect(view.getByTestId('names-unavailable')).toBeOnTheScreen();
  });
});
