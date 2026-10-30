import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { HabitsSection } from './HabitsSection';

describe('HabitsSection', () => {
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

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<HabitsSection />, { locale });

    const expectedHeader = locale === 'en' ? 'Habit & Reminders' : 'الورد والتذكير';
    expect(view.getByRole('header', { name: expectedHeader })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/settings/components/HabitsSection.tsx')).toEqual([]);
  });
});
