import { i18n } from '@/core/i18n';

import { locales, renderUi } from '../../../../jest/render-ui';

import { RemindersIntro } from './RemindersIntro';

describe('RemindersIntro', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
  });

  it('says reminders stay on this device and nothing is sent until one is on', async () => {
    const view = await renderUi(<RemindersIntro />);

    expect(view.getByText('تُحفظ التذكيرات على هذا الجهاز. لا يُرسل أي تذكير حتى تفعّله.')).toBeOnTheScreen();
  });

  it.each(locales)('renders in %s', async (locale) => {
    await i18n.changeLanguage(locale);
    const view = await renderUi(<RemindersIntro />, { locale });

    expect(view.getByTestId('reminders-intro')).toBeOnTheScreen();
  });
});
