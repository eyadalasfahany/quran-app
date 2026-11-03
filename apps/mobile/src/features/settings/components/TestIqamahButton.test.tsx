import { fireEvent, waitFor } from '@testing-library/react-native';

import { i18n } from '@/core/i18n';

import { renderUi } from '../../../../jest/render-ui';
import { sendTestIqamahNotification } from '@/features/salah/data/test-iqamah';

import { TestIqamahButton } from './TestIqamahButton';

jest.mock('@/features/salah/data/test-iqamah', () => ({
  sendTestIqamahNotification: jest.fn(() =>
    Promise.resolve({ sent: true, prayer: 'asr', offsetMinutes: 0, paired: false, delaySeconds: 5 }),
  ),
}));

describe('TestIqamahButton', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('ar');
  });

  it('is a labelled button that fires a test iqamah notification', async () => {
    const view = await renderUi(<TestIqamahButton />);

    expect(view.getByRole('button', { name: 'إرسال إشعار إقامة تجريبي' })).toBeOnTheScreen();
    fireEvent.press(view.getByTestId('iqamah-test'));

    await waitFor(() =>
      expect(view.getByText('إشعار إقامة العصر خلال ٥ ثوانٍ')).toBeOnTheScreen(),
    );
    expect(sendTestIqamahNotification).toHaveBeenCalledWith();
  });

  it('shows the paired caption when the sender paired adhan', async () => {
    jest.mocked(sendTestIqamahNotification).mockResolvedValueOnce({
      sent: true,
      prayer: 'fajr',
      offsetMinutes: 10,
      paired: true,
      delaySeconds: 5,
    });

    const view = await renderUi(<TestIqamahButton />);
    fireEvent.press(view.getByTestId('iqamah-test'));

    await waitFor(() =>
      expect(
        view.getByText('إقامة الفجر بعد ٥ ث، ثم الأذان بعد ١٥ ث (الثواني تمثّل الدقائق للتجربة)'),
      ).toBeOnTheScreen(),
    );
  });

  it('shows nothing until a test has been sent', async () => {
    const view = await renderUi(<TestIqamahButton />);

    expect(view.queryByTestId('iqamah-test-result')).toBeNull();
  });

  it('reads in English', async () => {
    await i18n.changeLanguage('en');
    const view = await renderUi(<TestIqamahButton />, { locale: 'en' });

    expect(view.getByRole('button', { name: 'Send a test iqamah' })).toBeOnTheScreen();
  });
});
