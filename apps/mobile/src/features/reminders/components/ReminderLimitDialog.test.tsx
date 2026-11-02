import { fireEvent } from '@testing-library/react-native';

import { i18n } from '@/core/i18n';

import { locales, renderUi } from '../../../../jest/render-ui';

import { ReminderLimitDialog } from './ReminderLimitDialog';

const SHOWN = { includeHiddenElements: true } as const;

describe('ReminderLimitDialog', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
  });

  it('says the reminder limit is reached, with one button', async () => {
    const view = await renderUi(<ReminderLimitDialog onClose={jest.fn()} visible />);

    expect(view.getByText('بلغت الحد الأقصى للتذكيرات', SHOWN)).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'تم', ...SHOWN })).toBeOnTheScreen();
  });

  it('closes on the button', async () => {
    const onClose = jest.fn();
    const view = await renderUi(<ReminderLimitDialog onClose={onClose} visible />);

    fireEvent.press(view.getByRole('button', { name: 'تم', ...SHOWN }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('renders in %s', async (locale) => {
    await i18n.changeLanguage(locale);
    const view = await renderUi(<ReminderLimitDialog onClose={jest.fn()} visible />, { locale });

    expect(view.getByText(locale === 'ar' ? 'بلغت الحد الأقصى للتذكيرات' : 'Reminder limit reached', SHOWN)).toBeOnTheScreen();
  });
});
