import { fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useAzkarAvailable } from '@/features/azkar/data';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { HabitsSection } from './HabitsSection';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false), replace: jest.fn() },
}));

// The content database is not open under Jest, so Azkar availability is set per test.
jest.mock('@/features/azkar/data', () => ({
  ...jest.requireActual('@/features/azkar/data'),
  useAzkarAvailable: jest.fn(() => false),
}));

describe('HabitsSection', () => {
  beforeEach(() => {
    jest.mocked(useAzkarAvailable).mockReturnValue(false);
  });

  it('renders the daily reminder row and the khatma row', async () => {
    const view = await renderUi(<HabitsSection />);

    expect(view.getByTestId('daily-reminder-toggle-row')).toBeOnTheScreen();
    expect(view.getByTestId('habits-khatma-row')).toBeOnTheScreen();
  });

  it('shows the khatmaValue in the khatma row', async () => {
    const view = await renderUi(<HabitsSection khatmaValue="٣٠ يومًا" />);

    expect(view.getByText('٣٠ يومًا')).toBeOnTheScreen();
  });

  it('calls onPressKhatma when the khatma row is pressed', async () => {
    const onPressKhatma = jest.fn();
    const view = await renderUi(<HabitsSection onPressKhatma={onPressKhatma} />);

    fireEvent.press(view.getByTestId('habits-khatma-row'));

    expect(onPressKhatma).toHaveBeenCalledTimes(1);
  });

  it('has the correct section testID', async () => {
    const view = await renderUi(<HabitsSection testID="custom-habits" />);

    expect(view.getByTestId('custom-habits')).toBeOnTheScreen();
  });

  it('hides the Azkar reminder row when no Azkar content is installed', async () => {
    const view = await renderUi(<HabitsSection />);

    expect(view.queryByTestId('habits-azkar-reminders-row')).toBeNull();
  });

  it('shows the Azkar reminder row once Azkar content is installed, and opens the reminder sheet', async () => {
    jest.mocked(useAzkarAvailable).mockReturnValue(true);
    const view = await renderUi(<HabitsSection />);

    fireEvent.press(view.getByTestId('habits-azkar-reminders-row'));

    expect(view.getByText('تذكير الأذكار')).toBeOnTheScreen();
    expect(router.push).toHaveBeenCalledWith('/azkar/reminders');
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<HabitsSection />, { locale });

    const expectedHeader = locale === 'en' ? 'Habit & Reminders' : 'الورد والتذكير';
    expect(view.getByRole('header', { name: expectedHeader })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/settings/components/HabitsSection.tsx')).toEqual([]);
  });
});
