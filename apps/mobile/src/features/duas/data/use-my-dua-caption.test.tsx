import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderUi } from '../../../../jest/render-ui';
import { formatTime } from '@/core/i18n';
import { useAzkarReminder } from '@/features/azkar/reminders/hooks';
import type { AzkarReminder } from '@/features/azkar/reminders/reminders-repository';

import { useMyDuaCaption } from './use-my-dua-caption';

jest.mock('@/features/azkar/reminders/hooks', () => ({
  useAzkarReminder: jest.fn(() => null),
}));

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

/** Renders the hook's caption as text, so the test reads it through the real i18n and locale. */
function CaptionProbe({ title }: { title: string | null }) {
  return <Text testID="caption">{useMyDuaCaption('dua-1', title)}</Text>;
}

describe('useMyDuaCaption', () => {
  beforeEach(() => {
    jest.mocked(useAzkarReminder).mockReturnValue(null);
  });

  it('is the title, then «من كتابتك», joined with a middle dot', async () => {
    await renderUi(<CaptionProbe title="FIXTURE title 1 — not a dua" />);
    expect(screen.getByTestId('caption')).toHaveTextContent('FIXTURE title 1 — not a dua · من كتابتك');
  });

  it('is only «من كتابتك» without a title, and ignores a blank one', async () => {
    const view = await renderUi(<CaptionProbe title={null} />);
    expect(view.getByTestId('caption')).toHaveTextContent(/^من كتابتك$/);
    const blank = await renderUi(<CaptionProbe title="   " />);
    expect(blank.getByTestId('caption')).toHaveTextContent(/^من كتابتك$/);
  });

  it('adds the reminder time when a clock reminder is on', async () => {
    jest.mocked(useAzkarReminder).mockReturnValue(CLOCK_REMINDER);
    await renderUi(<CaptionProbe title={null} />);
    expect(screen.getByTestId('caption')).toHaveTextContent(
      `من كتابتك · تذكير ${formatTime(new Date(2026, 0, 1, 7, 5), 'ar')}`,
    );
  });

  it('leaves the reminder time out when the reminder is off', async () => {
    jest.mocked(useAzkarReminder).mockReturnValue({ ...CLOCK_REMINDER, enabled: false });
    await renderUi(<CaptionProbe title="FIXTURE title 1 — not a dua" />);
    expect(screen.getByTestId('caption')).toHaveTextContent('FIXTURE title 1 — not a dua · من كتابتك');
  });
});
