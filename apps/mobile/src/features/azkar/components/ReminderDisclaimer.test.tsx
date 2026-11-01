import { screen } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { ReminderDisclaimer } from './ReminderDisclaimer';

const DISCLAIMER = 'وقت التذكير من اختيارك، وليس وقتًا محددًا للذكر';

describe('ReminderDisclaimer', () => {
  it('always shows the line that the reminder time is the user choice', async () => {
    await renderUi(<ReminderDisclaimer />);

    expect(screen.getByText(DISCLAIMER)).toBeOnTheScreen();
    expect(screen.getByTestId('azkar-reminder-disclaimer')).toBeOnTheScreen();
  });

  it('takes a custom test id', async () => {
    await renderUi(<ReminderDisclaimer testID="custom-disclaimer" />);

    expect(screen.getByTestId('custom-disclaimer')).toBeOnTheScreen();
  });

  it.each(locales)('renders under %s', async (locale) => {
    await renderUi(<ReminderDisclaimer />, { locale });

    const text = locale === 'en' ? 'The reminder time is your choice, not a set time for the dhikr.' : DISCLAIMER;
    expect(screen.getByText(text)).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/azkar/components/ReminderDisclaimer.tsx')).toEqual([]);
  });
});
