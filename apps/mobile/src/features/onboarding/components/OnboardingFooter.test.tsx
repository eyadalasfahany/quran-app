import { fireEvent, screen } from '@testing-library/react-native';

import { themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { OnboardingFooter } from './OnboardingFooter';

const footerProps = {
  continueLabel: 'Continue',
  onContinue: jest.fn(),
  step: 2 as const,
  stepLabel: 'Step 2 of 4',
};

describe('OnboardingFooter', () => {
  beforeEach(() => footerProps.onContinue.mockClear());

  it.each(locales)('renders the step indicator and the continue button in %s', async (locale) => {
    await renderUi(<OnboardingFooter {...footerProps} />, { locale });

    expect(screen.getByLabelText('Step 2 of 4')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeOnTheScreen();
  });

  it('calls onContinue when the button is pressed', async () => {
    const view = await renderUi(<OnboardingFooter {...footerProps} />);

    await fireEvent.press(view.getByTestId('onboarding-continue'));

    expect(footerProps.onContinue).toHaveBeenCalledTimes(1);
  });

  it('sits on the screen surface with room above the dots, so scrolled content never shows through', async () => {
    const view = await renderUi(<OnboardingFooter {...footerProps} />, { theme: 'light' });

    expect(flatStyle(view.getByTestId('onboarding-footer').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surface,
      paddingTop: themes.light.space[3],
    });
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/onboarding/components/OnboardingFooter.tsx')).toEqual([]);
  });
});
