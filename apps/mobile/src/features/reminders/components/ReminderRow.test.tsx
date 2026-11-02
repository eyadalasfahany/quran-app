import { fireEvent } from '@testing-library/react-native';

import { i18n } from '@/core/i18n';

import { locales, renderUi } from '../../../../jest/render-ui';

import { ReminderRow } from './ReminderRow';

describe('ReminderRow', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
  });

  it('renders the switch with its title and the status as the subtitle', async () => {
    const view = await renderUi(
      <ReminderRow onValueChange={jest.fn()} status="scheduled" testID="row" title="سورة الكهف" value />,
    );

    expect(view.getByText('سورة الكهف')).toBeOnTheScreen();
    expect(view.getByText('مفعّل')).toBeOnTheScreen();
    expect(view.getByRole('switch', { name: 'سورة الكهف, مفعّل' })).toBeOnTheScreen();
  });

  it('joins the detail and the status with a separator', async () => {
    const view = await renderUi(
      <ReminderRow detail="الفجر · عند الصلاة" onValueChange={jest.fn()} status="scheduled" testID="row" title="أذكار" value />,
    );

    expect(view.getByText('الفجر · عند الصلاة · مفعّل')).toBeOnTheScreen();
  });

  it('shows a status without a detail alone', async () => {
    const view = await renderUi(
      <ReminderRow onValueChange={jest.fn()} status="needsTime" testID="row" title="أذكار" value={false} />,
    );

    expect(view.getByText('اختر وقتًا')).toBeOnTheScreen();
  });

  it('reports a switch change', async () => {
    const onValueChange = jest.fn();
    const view = await renderUi(<ReminderRow onValueChange={onValueChange} status="off" testID="row" title="أذكار" value={false} />);

    fireEvent(view.getByTestId('row'), 'valueChange', true);

    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('opens the reminder sheet when the row is pressed, without touching the switch', async () => {
    const onPress = jest.fn();
    const onValueChange = jest.fn();
    const view = await renderUi(
      <ReminderRow onPress={onPress} onValueChange={onValueChange} status="off" testID="row" title="أذكار" value={false} />,
    );

    fireEvent.press(view.getByTestId('row-row'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it.each(locales)('reads the status in %s', async (locale) => {
    const view = await renderUi(<ReminderRow onValueChange={jest.fn()} status="off" testID="row" title="Friday" value={false} />, {
      locale,
    });

    expect(view.getByText(locale === 'ar' ? 'متوقف' : 'Off')).toBeOnTheScreen();
  });
});
