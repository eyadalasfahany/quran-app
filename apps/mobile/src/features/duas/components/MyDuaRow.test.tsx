import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { formatTime } from '@/core/i18n';
import { useAzkarReminder } from '@/features/azkar/reminders/hooks';
import type { AzkarReminder } from '@/features/azkar/reminders/reminders-repository';
import type { MyDua } from '../data/my-duas-repository';
import { MyDuaRow } from './MyDuaRow';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@/features/azkar/reminders/hooks', () => ({
  useAzkarReminder: jest.fn(() => null),
}));

const dua: MyDua = {
  id: 'dua-1',
  title: 'FIXTURE title 1 — not a dua',
  body: 'FIXTURE text 1 — not a dua',
  textSearch: 'fixture',
  createdAt: 1,
  updatedAt: 1,
};

const CLOCK_REMINDER: AzkarReminder = {
  id: 'r-1',
  targetType: 'my_dua',
  targetKey: 'dua-1',
  enabled: true,
  triggerType: 'clock',
  clockTime: '07:05',
  prayer: null,
  offsetMinutes: null,
  notificationIds: [],
  updatedAt: 1,
};

describe('MyDuaRow', () => {
  beforeEach(() => {
    jest.mocked(useAzkarReminder).mockReturnValue(null);
  });

  it('shows the dua text as the preview, even when it has a title', async () => {
    await renderUi(<MyDuaRow dua={dua} index={0} onBellPress={jest.fn()} />);
    expect(screen.getByText(dua.body)).toBeOnTheScreen();
    expect(screen.getByTestId('my-dua-row-caption')).toHaveTextContent(`${dua.title} · من كتابتك`);
  });

  it('keeps the caption on one line: the title, then «من كتابتك», joined with a middle dot', async () => {
    await renderUi(<MyDuaRow dua={dua} index={0} onBellPress={jest.fn()} />);
    const caption = screen.getByTestId('my-dua-row-caption');
    expect(caption).toHaveTextContent(`${dua.title} · من كتابتك`);
    expect(caption.props.numberOfLines).toBe(1);
  });

  it('shows only «من كتابتك» in the caption when there is no title', async () => {
    await renderUi(<MyDuaRow dua={{ ...dua, title: null }} index={0} onBellPress={jest.fn()} />);
    expect(screen.getByTestId('my-dua-row-caption')).toHaveTextContent(/^من كتابتك$/);
  });

  it('adds the reminder time to the caption when the reminder is on with a clock time', async () => {
    jest.mocked(useAzkarReminder).mockReturnValue(CLOCK_REMINDER);
    await renderUi(<MyDuaRow dua={dua} index={0} onBellPress={jest.fn()} />, { locale: 'en' });
    const time = formatTime(new Date(2026, 0, 1, 7, 5), 'en');
    expect(screen.getByTestId('my-dua-row-caption')).toHaveTextContent(`${dua.title} · Written by you · Reminder ${time}`);
  });

  it('leaves the reminder time out when the reminder is off', async () => {
    jest.mocked(useAzkarReminder).mockReturnValue({ ...CLOCK_REMINDER, enabled: false });
    await renderUi(<MyDuaRow dua={dua} index={0} onBellPress={jest.fn()} />, { locale: 'en' });
    expect(screen.getByTestId('my-dua-row-caption')).not.toHaveTextContent('Reminder ');
  });

  it('marks the bell with the on hint and the brand tone when the reminder is on', async () => {
    jest.mocked(useAzkarReminder).mockReturnValue(CLOCK_REMINDER);
    const view = await renderUi(<MyDuaRow dua={dua} index={0} onBellPress={jest.fn()} />);
    expect(view.getByRole('button', { name: 'تذكير' }).props.accessibilityHint).toBe('مفعّل');
  });

  it('gives the bell no hint when the reminder is off', async () => {
    const view = await renderUi(<MyDuaRow dua={dua} index={0} onBellPress={jest.fn()} />);
    expect(view.getByRole('button', { name: 'تذكير' }).props.accessibilityHint).toBeUndefined();
  });

  it('names the row by the dua text and caption, and calls onBellPress from the bell', async () => {
    const onBell = jest.fn();
    const view = await renderUi(<MyDuaRow dua={dua} index={0} onBellPress={onBell} />);
    const row = view.getByTestId('my-dua-row');
    expect(row.props.accessibilityLabel).toContain(dua.body);
    expect(row.props.accessibilityLabel).toContain('من كتابتك');
    await press(view.getByTestId('my-dua-row-bell'));
    expect(onBell).toHaveBeenCalledTimes(1);
  });

  it('renders in English', async () => {
    const view = await renderUi(<MyDuaRow dua={dua} index={0} onBellPress={jest.fn()} />, { locale: 'en' });
    expect(view.getByTestId('my-dua-row-caption')).toHaveTextContent(`${dua.title} · Written by you`);
  });

  it('opens the reading view when the row is pressed', async () => {
    const view = await renderUi(<MyDuaRow dua={dua} index={0} onBellPress={jest.fn()} />);
    await press(view.getByTestId('my-dua-row'));
    expect(router.push).toHaveBeenCalledWith('/duas/mine/dua-1');
  });

  it('uses i18n only', () => {
    expect(featureComponentLiterals('features/duas/components/MyDuaRow.tsx')).toEqual([]);
  });
});
