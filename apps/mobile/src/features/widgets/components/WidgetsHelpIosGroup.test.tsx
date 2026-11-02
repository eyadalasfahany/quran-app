import { locales, renderUi } from '../../../../jest/render-ui';

import { WidgetsHelpIosGroup } from './WidgetsHelpIosGroup';

describe('WidgetsHelpIosGroup', () => {
  it.each(locales)('renders iOS steps in %s', async (locale) => {
    const view = await renderUi(<WidgetsHelpIosGroup />, { locale });
    expect(view.getByTestId('widgets-help-ios-steps')).toBeOnTheScreen();
  });
});
