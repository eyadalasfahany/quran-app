import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../jest/render-ui';

import { OnboardingRadioCard } from './OnboardingRadioCard';

describe('OnboardingRadioCard', () => {
  it.each(locales)('fires onPress as a radio in %s', async (locale) => {
    const onPress = jest.fn();
    const view = await renderUi(
      <OnboardingRadioCard onPress={onPress} selected={false} title="English" />,
      { locale },
    );
    fireEvent.press(view.getByRole('radio'));
    expect(onPress).toHaveBeenCalled();
  });

  it('exposes checked state', async () => {
    const view = await renderUi(<OnboardingRadioCard onPress={() => undefined} selected title="العربية" />);
    expect(view.getByRole('radio').props.accessibilityState?.checked).toBe(true);
  });
});
