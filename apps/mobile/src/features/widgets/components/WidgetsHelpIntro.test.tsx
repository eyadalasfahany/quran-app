import { locales, renderUi } from '../../../../jest/render-ui';

import { WidgetsHelpIntro } from './WidgetsHelpIntro';

describe('WidgetsHelpIntro', () => {
  it.each(locales)('renders the intro in %s', async (locale) => {
    const view = await renderUi(<WidgetsHelpIntro />, { locale });
    expect(view.getByTestId('widgets-help-intro')).toBeOnTheScreen();
  });
});
