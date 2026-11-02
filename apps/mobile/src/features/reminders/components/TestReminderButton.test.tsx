import { fireEvent, waitFor } from '@testing-library/react-native';

import { i18n } from '@/core/i18n';

import { renderUi } from '../../../../jest/render-ui';
import { sendTestReminder } from '../data/test-reminder';

import { TestReminderButton } from './TestReminderButton';

jest.mock('../data/test-reminder', () => ({ sendTestReminder: jest.fn(() => Promise.resolve(true)) }));

describe('TestReminderButton', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('ar');
  });

  it('is a labelled button that fires a test reminder', async () => {
    const view = await renderUi(<TestReminderButton />);

    expect(view.getByRole('button', { name: 'إرسال تذكير تجريبي' })).toBeOnTheScreen();
    fireEvent.press(view.getByTestId('reminders-test'));

    await waitFor(() => expect(view.getByText('سيظهر التذكير التجريبي خلال ٥ ثوانٍ')).toBeOnTheScreen());
    expect(sendTestReminder).toHaveBeenCalledWith(undefined);
  });

  it('offers the two-minute check in development', async () => {
    const view = await renderUi(<TestReminderButton />);

    fireEvent.press(view.getByTestId('reminders-test-dev'));

    await waitFor(() => expect(view.getByText('يظهر التذكير التجريبي بعد دقيقتين')).toBeOnTheScreen());
    expect(sendTestReminder).toHaveBeenCalledWith(120);
  });

  it('shows nothing until a test has been sent', async () => {
    const view = await renderUi(<TestReminderButton />);

    expect(view.queryByTestId('reminders-test-result')).toBeNull();
  });

  it('reads in English', async () => {
    await i18n.changeLanguage('en');
    const view = await renderUi(<TestReminderButton />, { locale: 'en' });

    expect(view.getByRole('button', { name: 'Send a test reminder' })).toBeOnTheScreen();
  });
});
