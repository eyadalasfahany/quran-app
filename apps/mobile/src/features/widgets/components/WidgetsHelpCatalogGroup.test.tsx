import { locales, renderUi } from '../../../../jest/render-ui';

import { WidgetsHelpCatalogGroup } from './WidgetsHelpCatalogGroup';

describe('WidgetsHelpCatalogGroup', () => {
  it.each(locales)('lists all six widgets in %s', async (locale) => {
    const view = await renderUi(<WidgetsHelpCatalogGroup />, { locale });
    expect(view.getByTestId('widgets-help-item-nextPrayer')).toBeOnTheScreen();
    expect(view.getByTestId('widgets-help-item-azkar')).toBeOnTheScreen();
  });
});
