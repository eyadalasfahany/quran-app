import { locales, renderUi } from '../../../../jest/render-ui';

import { WidgetsHelpWidgetRow } from './WidgetsHelpWidgetRow';

describe('WidgetsHelpWidgetRow', () => {
  it.each(locales)('shows title and subtitle in %s', async (locale) => {
    const title = locale === 'en' ? 'Next prayer' : 'الصلاة القادمة';
    const subtitle = locale === 'en' ? 'Prayer name and time' : 'اسم الصلاة ووقتها';
    const view = await renderUi(<WidgetsHelpWidgetRow subtitle={subtitle} testID="row" title={title} />, { locale });

    expect(view.getByText(title)).toBeOnTheScreen();
    expect(view.getByText(subtitle)).toBeOnTheScreen();
    expect(view.queryByRole('button')).toBeNull();
  });
});
