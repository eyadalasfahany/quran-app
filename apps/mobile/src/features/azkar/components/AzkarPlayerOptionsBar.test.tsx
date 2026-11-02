import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';

import { AzkarPlayerOptionsBar } from './AzkarPlayerOptionsBar';

const props = () => ({
  repeatLabel: 'حسب العدد',
  speedLabel: 'السرعة ١×',
  sleepLabel: 'مؤقت النوم',
  sleepArmed: false,
  onRepeat: jest.fn(),
  onSpeed: jest.fn(),
  onSleep: jest.fn(),
});

describe('AzkarPlayerOptionsBar', () => {
  it('shows the repeat mode, the speed and the sleep timer', async () => {
    await renderUi(<AzkarPlayerOptionsBar {...props()} />);
    expect(screen.getByText('حسب العدد')).toBeTruthy();
    expect(screen.getByText('السرعة ١×')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'التكرار' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'مؤقت النوم' })).toBeTruthy();
  });

  it('calls each option handler when its button is pressed', async () => {
    const p = props();
    await renderUi(<AzkarPlayerOptionsBar {...p} />);
    await press(screen.getByRole('button', { name: 'التكرار' }));
    await press(screen.getByRole('button', { name: 'السرعة ١×' }));
    await press(screen.getByRole('button', { name: 'مؤقت النوم' }));
    expect(p.onRepeat).toHaveBeenCalledTimes(1);
    expect(p.onSpeed).toHaveBeenCalledTimes(1);
    expect(p.onSleep).toHaveBeenCalledTimes(1);
  });

  it('marks the sleep timer selected while it is armed', async () => {
    await renderUi(<AzkarPlayerOptionsBar {...props()} sleepArmed sleepLabel="١٥ د" />);
    expect(screen.getByRole('button', { name: 'مؤقت النوم' }).props.accessibilityState).toEqual({ selected: true });
  });

  it('marks an open option selected', async () => {
    await renderUi(<AzkarPlayerOptionsBar {...props()} speedOpen />);
    expect(screen.getByRole('button', { name: 'السرعة ١×' }).props.accessibilityState).toEqual({ selected: true });
  });

  it('renders in English', async () => {
    await renderUi(<AzkarPlayerOptionsBar {...props()} repeatLabel="By count" speedLabel="Speed 1×" sleepLabel="Sleep timer" />, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Repeat' })).toBeTruthy();
    expect(screen.getByText('By count')).toBeTruthy();
  });
});
