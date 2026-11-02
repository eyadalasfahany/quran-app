

import { i18n } from '@/core/i18n';

import { renderUi } from '../../../../jest/render-ui';

import { ReminderClockRow } from './ReminderClockRow';

// The time picker is a native sheet. This stand-in shows a pressable that picks 07:45, so the row's wiring is what's tested.
jest.mock('@/features/settings/components/ReminderTimeSheet', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    ReminderTimeSheet: (props: { testID?: string; onPick: (date: Date) => void }) =>
      createElement(Pressable, { testID: props.testID, onPress: () => props.onPick(new Date(2026, 0, 1, 7, 45)) }),
  };
});

describe('ReminderClockRow', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
  });

  it('asks for a time when none is chosen, with no time suggested', async () => {
    const view = await renderUi(<ReminderClockRow clockTime={null} label="الوقت" onChange={jest.fn()} testID="clock" />);

    expect(view.getByText('الوقت')).toBeOnTheScreen();
    expect(view.getByText('اختر وقتًا')).toBeOnTheScreen();
  });

  it('shows the chosen time', async () => {
    const view = await renderUi(<ReminderClockRow clockTime="07:45" label="الوقت" onChange={jest.fn()} testID="clock" />);

    expect(view.queryByText('اختر وقتًا')).toBeNull();
    expect(view.getByTestId('clock')).toBeOnTheScreen();
  });

  it('is an accessible button with its label', async () => {
    const view = await renderUi(<ReminderClockRow clockTime={null} label="الوقت" onChange={jest.fn()} testID="clock" />);

    expect(view.getByRole('button', { name: /الوقت/ })).toBeOnTheScreen();
  });
});
