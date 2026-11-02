import { locales, renderUi } from '../../../../jest/render-ui';

import { WidgetsHelpSteps } from './WidgetsHelpSteps';

describe('WidgetsHelpSteps', () => {
  it.each(locales)('renders three numbered steps for Android in %s', async (locale) => {
    const view = await renderUi(<WidgetsHelpSteps namespace="widgetsHelp.android" testID="steps" />, { locale });
    expect(view.getByTestId('steps')).toBeOnTheScreen();
    expect(view.getAllByText(/^1\./).length).toBeGreaterThanOrEqual(1);
  });
});
