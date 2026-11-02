import { locales, renderUi } from '../../../../jest/render-ui';

import { WidgetsHelpWatchGroup } from './WidgetsHelpWatchGroup';

describe('WidgetsHelpWatchGroup', () => {
  it.each(locales)('renders the watch note in %s', async (locale) => {
    const view = await renderUi(<WidgetsHelpWatchGroup />, { locale });
    expect(view.getByTestId('widgets-help-watch')).toBeOnTheScreen();
  });
});
