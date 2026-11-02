import { router } from 'expo-router';
import { fireEvent } from '@testing-library/react-native';

import { i18n } from '@/core/i18n';

import { renderUi } from '../../../../jest/render-ui';

import { RemindersEntryRow } from './RemindersEntryRow';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('RemindersEntryRow', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('ar');
  });

  it('shows its title and subtitle as a link row', async () => {
    const view = await renderUi(<RemindersEntryRow subtitle="الصلاة والأذكار" title="كل التذكيرات" />);

    expect(view.getByText('كل التذكيرات')).toBeOnTheScreen();
    expect(view.getByText('الصلاة والأذكار')).toBeOnTheScreen();
  });

  it('opens the reminders hub', async () => {
    const view = await renderUi(<RemindersEntryRow subtitle="x" testID="entry" title="كل التذكيرات" />);

    fireEvent.press(view.getByTestId('entry'));

    expect(router.push).toHaveBeenCalledWith('/reminders');
  });
});
