import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/core/i18n';
import { storage } from '@/core/storage/mmkv';
import { PRAYER_ROUTE } from '@/features/salah/data/notifications';
import { azkarHref } from '@/features/azkar/routes';

import { updateRenewReminder } from './renew';

const NOW = new Date(2026, 10, 9, 12, 0, 0, 0);
const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

type Pending = { identifier: string; content: { data?: Record<string, unknown> }; trigger: Record<string, unknown> };
let pending: Pending[] = [];
let sequence = 0;

function renewPending(): Pending[] {
  return pending.filter((request) => request.content.data?.kind === 'renew');
}

function scheduledCalls() {
  return jest.mocked(Notifications.scheduleNotificationAsync).mock.calls.map(([request]) => request as never as {
    content: { title: string; body: string; data: Record<string, unknown> };
    trigger: Record<string, unknown>;
  });
}

describe('updateRenewReminder', () => {
  let platform: typeof Platform.OS;

  beforeEach(async () => {
    storage.clearAll();
    jest.clearAllMocks();
    await i18n.changeLanguage('ar');
    platform = Platform.OS;
    pending = [];
    sequence = 0;
    jest.mocked(Notifications.scheduleNotificationAsync).mockImplementation((request) => {
      sequence += 1;
      const identifier = `n-${sequence}`;
      pending.push({ identifier, content: request.content as Pending['content'], trigger: request.trigger as never });
      return Promise.resolve(identifier);
    });
    jest.mocked(Notifications.cancelScheduledNotificationAsync).mockImplementation((identifier) => {
      pending = pending.filter((request) => request.identifier !== identifier);
      return Promise.resolve();
    });
    jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockImplementation(() => Promise.resolve(pending as never));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.replaceProperty(Platform, 'OS', platform);
  });

  it('schedules the renew a day before the earliest schedule runs out, with the kind and the prayer route', async () => {
    const last = new Date(NOW.getTime() + 5 * DAY);

    await updateRenewReminder('prayer', last, NOW);

    expect(scheduledCalls()).toHaveLength(1);
    expect(scheduledCalls()[0]?.trigger).toEqual({ type: 'date', date: new Date(last.getTime() - DAY) });
    expect(scheduledCalls()[0]?.content.data).toEqual({ route: PRAYER_ROUTE, kind: 'renew' });
    expect(PRAYER_ROUTE).toBe('/salah');
  });

  it('uses the earliest source: the azkar schedule that runs out first wins', async () => {
    await updateRenewReminder('prayer', new Date(NOW.getTime() + 6 * DAY), NOW);
    await updateRenewReminder('azkar', new Date(NOW.getTime() + 3 * DAY), NOW);

    expect(renewPending()).toHaveLength(1);
    expect(scheduledCalls()[1]?.trigger).toEqual({ type: 'date', date: new Date(NOW.getTime() + 2 * DAY) });
    expect(scheduledCalls()[1]?.content.data).toEqual({ route: String(azkarHref.home), kind: 'renew' });
  });

  it('a past source does not hide a future one: the prayer renew is scheduled when azkar already ran out', async () => {
    await updateRenewReminder('azkar', new Date(NOW.getTime() - 2 * DAY), NOW);
    await updateRenewReminder('prayer', new Date(NOW.getTime() + 5 * DAY), NOW);

    expect(renewPending()).toHaveLength(1);
    expect(scheduledCalls()[0]?.trigger).toEqual({ type: 'date', date: new Date(NOW.getTime() + 4 * DAY) });
    expect(scheduledCalls()[0]?.content.data).toEqual({ route: PRAYER_ROUTE, kind: 'renew' });
  });

  it('keeps the earliest source when a later one is recorded, so the renew does not move later', async () => {
    await updateRenewReminder('azkar', new Date(NOW.getTime() + 3 * DAY), NOW);
    await updateRenewReminder('prayer', new Date(NOW.getTime() + 6 * DAY), NOW);

    expect(renewPending()).toHaveLength(1);
    expect(renewPending()[0]?.trigger).toEqual({ type: 'date', date: new Date(NOW.getTime() + 2 * DAY) });
  });

  it('falls back to one minute after the earliest schedule when a day before is already past', async () => {
    const last = new Date(NOW.getTime() + 12 * 60 * 60 * 1000);

    await updateRenewReminder('prayer', last, NOW);

    expect(scheduledCalls()[0]?.trigger).toEqual({ type: 'date', date: new Date(last.getTime() + MINUTE) });
  });

  it('schedules nothing when both the renew and the one-minute fallback are past', async () => {
    await updateRenewReminder('prayer', new Date(NOW.getTime() - 10 * MINUTE), NOW);

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('ignores a null source: a null azkar leaves the prayer renew in place', async () => {
    await updateRenewReminder('prayer', new Date(NOW.getTime() + 5 * DAY), NOW);
    await updateRenewReminder('azkar', null, NOW);

    expect(renewPending()).toHaveLength(1);
    expect(scheduledCalls()[0]?.content.data.route).toBe(PRAYER_ROUTE);
  });

  it('schedules nothing when every source is null, and clears the old renew', async () => {
    await updateRenewReminder('prayer', new Date(NOW.getTime() + 5 * DAY), NOW);
    await updateRenewReminder('prayer', null, NOW);

    expect(renewPending()).toHaveLength(0);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it('cancels an old renew before scheduling the new one, so only one is pending', async () => {
    await updateRenewReminder('prayer', new Date(NOW.getTime() + 5 * DAY), NOW);
    await updateRenewReminder('prayer', new Date(NOW.getTime() + 7 * DAY), NOW);

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('n-1');
    expect(renewPending()).toHaveLength(1);
    expect(renewPending()[0]?.trigger).toEqual({ type: 'date', date: new Date(NOW.getTime() + 6 * DAY) });
  });

  it('on Android uses the reminders channel and no delivery key', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');

    await updateRenewReminder('prayer', new Date(NOW.getTime() + 5 * DAY), NOW);

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('reminders', expect.anything());
    const trigger = scheduledCalls()[0]?.trigger;
    expect(trigger).toMatchObject({ type: 'date', channelId: 'reminders' });
    expect(trigger).not.toHaveProperty('delivery');
  });

  it('on iOS the trigger has neither a channel nor a delivery key', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');

    await updateRenewReminder('azkar', new Date(NOW.getTime() + 5 * DAY), NOW);

    const trigger = scheduledCalls()[0]?.trigger;
    expect(trigger).not.toHaveProperty('channelId');
    expect(trigger).not.toHaveProperty('delivery');
  });

  it('uses the Arabic copy for the source that will run out', async () => {
    await updateRenewReminder('azkar', new Date(NOW.getTime() + 5 * DAY), NOW);

    expect(scheduledCalls()[0]?.content.title).toBe('تذكيرات الأذكار');
    expect(scheduledCalls()[0]?.content.body).toBe('افتح طيبة ليستمر وصول تذكيرات الأذكار.');
  });

  it('never throws: a scheduler failure is logged', async () => {
    jest.mocked(Notifications.scheduleNotificationAsync).mockRejectedValueOnce(new Error('boom'));

    await expect(updateRenewReminder('prayer', new Date(NOW.getTime() + 5 * DAY), NOW)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});
