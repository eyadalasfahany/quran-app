import { i18n } from '@/core/i18n';

import { locales, renderUi } from '../../../../jest/render-ui';

import { RecommendedReminderItem } from './RecommendedReminderItem';

describe('RecommendedReminderItem', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
  });

  it('renders its label as a plain row, with no switch and no disclosure', async () => {
    const view = await renderUi(<RecommendedReminderItem label="أوقات الصلاة الخمسة" testID="item" />);

    expect(view.getByText('أوقات الصلاة الخمسة')).toBeOnTheScreen();
    expect(view.queryByRole('switch')).toBeNull();
    expect(view.getByTestId('item')).toBeOnTheScreen();
  });

  it.each(locales)('renders the label in %s', async (locale) => {
    const view = await renderUi(<RecommendedReminderItem label="Friday" testID="item" />, { locale });

    expect(view.getByText('Friday')).toBeOnTheScreen();
  });
});
