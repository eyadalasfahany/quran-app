import { renderUi } from '../../../../jest/render-ui';

import { NamesScreenHeader } from './NamesScreenHeader';

describe('NamesScreenHeader', () => {
  it('renders the title', async () => {
    const view = await renderUi(<NamesScreenHeader onBack={jest.fn()} title="FIXTURE title" />);
    expect(view.getByText('FIXTURE title')).toBeOnTheScreen();
  });
});
