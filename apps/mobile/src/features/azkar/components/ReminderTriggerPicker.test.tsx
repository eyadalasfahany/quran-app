import { fireEvent, screen } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { ReminderTriggerPicker } from './ReminderTriggerPicker';

describe('ReminderTriggerPicker', () => {
  it('offers a clock time and a prayer, with the current one selected', async () => {
    await renderUi(<ReminderTriggerPicker onChange={jest.fn()} value="clock" />);

    expect(screen.getByRole('tab', { name: 'وقت محدد' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'بعد صلاة' })).not.toBeSelected();
  });

  it('reports the other option when it is pressed', async () => {
    const onChange = jest.fn();
    await renderUi(<ReminderTriggerPicker onChange={onChange} value="clock" />);

    fireEvent.press(screen.getByRole('tab', { name: 'بعد صلاة' }));

    expect(onChange).toHaveBeenCalledWith('prayer_relative');
  });

  it('does nothing when the selected option is pressed again', async () => {
    const onChange = jest.fn();
    await renderUi(<ReminderTriggerPicker onChange={onChange} value="prayer_relative" />);

    fireEvent.press(screen.getByRole('tab', { name: 'بعد صلاة' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('is labelled as the reminder time group', async () => {
    await renderUi(<ReminderTriggerPicker onChange={jest.fn()} value="clock" />);

    expect(screen.getByLabelText('نوع وقت التذكير')).toBeOnTheScreen();
  });

  it.each(locales)('renders under %s', async (locale) => {
    await renderUi(<ReminderTriggerPicker onChange={jest.fn()} value="clock" />, { locale });

    const clock = locale === 'en' ? 'Set time' : 'وقت محدد';
    expect(screen.getByRole('tab', { name: clock })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/azkar/components/ReminderTriggerPicker.tsx')).toEqual([]);
  });
});
