import { fireEvent, waitFor } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { ReminderTimeSheet } from './ReminderTimeSheet';

const VALUE = new Date(2026, 9, 30, 21, 0, 0, 0);

describe('ReminderTimeSheet', () => {
  it('renders the spinner with cancel and done actions', async () => {
    const view = await renderUi(<ReminderTimeSheet onClose={jest.fn()} onPick={jest.fn()} testID="picker" value={VALUE} />);

    expect(view.getByTestId('picker')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'إلغاء' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'تم' })).toBeOnTheScreen();
  });

  it('commits the draft time on done', async () => {
    const onPick = jest.fn();
    const view = await renderUi(<ReminderTimeSheet onClose={jest.fn()} onPick={onPick} testID="picker" value={VALUE} />);

    const chosen = new Date(2026, 9, 30, 6, 30, 0, 0);
    fireEvent(view.getByTestId('picker'), 'change', { type: 'set' }, chosen);
    // Concurrent rendering: wait for the draft re-render before pressing done.
    await waitFor(() => expect(view.getByTestId('picker').props.value).toBe(chosen));
    fireEvent.press(view.getByRole('button', { name: 'تم' }));

    expect(onPick).toHaveBeenCalledWith(chosen);
  });

  it('keeps the original time when done is pressed without changes', async () => {
    const onPick = jest.fn();
    const view = await renderUi(<ReminderTimeSheet onClose={jest.fn()} onPick={onPick} value={VALUE} />);

    fireEvent.press(view.getByRole('button', { name: 'تم' }));

    expect(onPick).toHaveBeenCalledWith(VALUE);
  });

  it('closes from cancel without picking', async () => {
    const onClose = jest.fn();
    const onPick = jest.fn();
    const view = await renderUi(<ReminderTimeSheet onClose={onClose} onPick={onPick} testID="picker" value={VALUE} />);

    fireEvent.press(view.getByRole('button', { name: 'إلغاء' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<ReminderTimeSheet onClose={jest.fn()} onPick={jest.fn()} value={VALUE} />, { locale });

    const expectedDone = locale === 'en' ? 'Done' : 'تم';
    expect(view.getByRole('button', { name: expectedDone })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/settings/components/ReminderTimeSheet.tsx')).toEqual([]);
  });
});
