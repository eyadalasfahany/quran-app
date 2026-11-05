import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { formatTime } from '@/core/i18n';
import { useAzkarReminder } from '@/features/azkar/reminders/hooks';
import type { AzkarReminder } from '@/features/azkar/reminders/reminders-repository';
import { MyDuaReminderRow } from './MyDuaReminderRow';

jest.mock('@/features/azkar/components/AzkarReminderRow', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    AzkarReminderRow: ({ targetType, targetKey }: { targetType: string; targetKey: string }) => (
      <Text testID="azkar-reminder-row">{`${targetType}:${targetKey}`}</Text>
    ),
  };
});

jest.mock('@/features/azkar/reminders/hooks', () => ({
  useAzkarReminder: jest.fn(() => null),
}));

const BASE: AzkarReminder = {
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

describe('MyDuaReminderRow', () => {
  beforeEach(() => {
    jest.mocked(useAzkarReminder).mockReturnValue(null);
  });

  it('is collapsed by default and shows the Azkar settings only once expanded', async () => {
    await renderUi(<MyDuaReminderRow duaId="dua-1" />);
    expect(screen.queryByTestId('azkar-reminder-row')).toBeNull();
    expect(screen.getByRole('button', { name: 'التذكير' }).props.accessibilityState).toEqual({ expanded: false });

    await press(screen.getByRole('button', { name: 'التذكير' }));
    expect(screen.getByText('my_dua:dua-1')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'التذكير' }).props.accessibilityState).toEqual({ expanded: true });
  });

  it('opens expanded when initiallyExpanded is set', async () => {
    await renderUi(<MyDuaReminderRow duaId="dua-1" initiallyExpanded />);
    expect(screen.getByText('my_dua:dua-1')).toBeOnTheScreen();
  });

  it('says off when there is no reminder or it is disabled', async () => {
    await renderUi(<MyDuaReminderRow duaId="dua-1" />);
    expect(screen.getByRole('button', { name: 'التذكير' }).props.accessibilityHint).toBe('غير مفعّل');
  });

  it('shows the clock time when on with a clock time', async () => {
    jest.mocked(useAzkarReminder).mockReturnValue(BASE);
    await renderUi(<MyDuaReminderRow duaId="dua-1" />, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Reminder' }).props.accessibilityHint).toBe(formatTime(new Date(2026, 0, 1, 7, 5), 'en'));
  });

  it('says on when on without a clock time', async () => {
    jest.mocked(useAzkarReminder).mockReturnValue({ ...BASE, triggerType: 'prayer_relative', prayer: 'fajr', offsetMinutes: 0 });
    await renderUi(<MyDuaReminderRow duaId="dua-1" />);
    expect(screen.getByRole('button', { name: 'التذكير' }).props.accessibilityHint).toBe('مفعّل');
  });

  it('renders the English title and off state', async () => {
    await renderUi(<MyDuaReminderRow duaId="dua-1" />, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Reminder' }).props.accessibilityHint).toBe('Off');
  });

  it('uses i18n only', () => {
    expect(featureComponentLiterals('features/duas/components/MyDuaReminderRow.tsx')).toEqual([]);
  });
});
