import * as Notifications from 'expo-notifications';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { dismissExactAlarmPrompt, showExactAlarmPrompt } from '../data/exact-alarm-prompt';
import * as notificationsData from '../data/notifications';

import { DefaultBellsExactAlarmPrompt } from './DefaultBellsExactAlarmPrompt';

const TITLE_AR = 'اجعل الأذان في وقته';
const TITLE_EN = 'Keep the adhan on time';
// The card stays mounted through its exit animation, so a closed dialog is hidden to the query until it leaves.
const SHOWN = { includeHiddenElements: true } as const;

describe('DefaultBellsExactAlarmPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dismissExactAlarmPrompt();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders no dialog until the prompt is shown', async () => {
    const view = await renderUi(<DefaultBellsExactAlarmPrompt />);

    expect(view.queryByText(TITLE_AR)).toBeNull();
  });

  it('shows the dialog after the prompt is raised, even when it was raised before mounting', async () => {
    showExactAlarmPrompt();

    const view = await renderUi(<DefaultBellsExactAlarmPrompt />);

    expect(view.getByText(TITLE_AR)).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'فتح الإعدادات' })).toBeOnTheScreen();
  });

  it('cancel hides the dialog and does not request exact-alarm access', async () => {
    showExactAlarmPrompt();
    const view = await renderUi(<DefaultBellsExactAlarmPrompt />);

    await fireEvent.press(view.getByRole('button', { name: 'إلغاء' }));

    await waitFor(() => expect(view.queryByText(TITLE_AR)).toBeNull());
    expect(Notifications.requestExactAlarmPermissionsAsync).not.toHaveBeenCalled();
  });

  it('confirm hides the dialog, requests access and re-plans when granted', async () => {
    jest.mocked(Notifications.requestExactAlarmPermissionsAsync).mockResolvedValueOnce({ granted: true } as never);
    const resync = jest.spyOn(notificationsData, 'resyncPrayerNotifications').mockResolvedValue(undefined);
    showExactAlarmPrompt();
    const view = await renderUi(<DefaultBellsExactAlarmPrompt />);

    await fireEvent.press(view.getByRole('button', { name: 'فتح الإعدادات' }));

    await waitFor(() => expect(resync).toHaveBeenCalledTimes(1));
    expect(Notifications.requestExactAlarmPermissionsAsync).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(view.queryByText(TITLE_AR, SHOWN)).toBeNull());
  });

  it('confirm does not re-plan when access is refused, and still hides the dialog', async () => {
    jest.mocked(Notifications.requestExactAlarmPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    const resync = jest.spyOn(notificationsData, 'resyncPrayerNotifications').mockResolvedValue(undefined);
    showExactAlarmPrompt();
    const view = await renderUi(<DefaultBellsExactAlarmPrompt />);

    await fireEvent.press(view.getByRole('button', { name: 'فتح الإعدادات' }));

    await waitFor(() => expect(view.queryByText(TITLE_AR)).toBeNull());
    expect(Notifications.requestExactAlarmPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(resync).not.toHaveBeenCalled();
  });

  it.each([
    ['ar', TITLE_AR, 'فتح الإعدادات'],
    ['en', TITLE_EN, 'Open Settings'],
  ] as const)('renders the dialog under %s with an accessible action', async (locale, title, action) => {
    showExactAlarmPrompt();

    const view = await renderUi(<DefaultBellsExactAlarmPrompt />, { locale });

    expect(view.getByText(title)).toBeOnTheScreen();
    expect(view.getByRole('button', { name: action })).toBeOnTheScreen();
  });

  it('hides the dialog through act without a request when dismissed from the store', async () => {
    showExactAlarmPrompt();
    const view = await renderUi(<DefaultBellsExactAlarmPrompt />);

    await act(async () => {
      dismissExactAlarmPrompt();
    });

    await waitFor(() => expect(view.queryByText(TITLE_AR, SHOWN)).toBeNull());
    expect(Notifications.requestExactAlarmPermissionsAsync).not.toHaveBeenCalled();
  });
});
