import { renderUi } from '../../../jest/render-ui';

import { OnboardingStepIndicator } from './OnboardingStepIndicator';

describe('OnboardingStepIndicator', () => {
  it('exposes step progress to accessibility', async () => {
    const view = await renderUi(<OnboardingStepIndicator accessibilityLabel="Step 2 of 4" step={2} />);
    expect(view.getByLabelText('Step 2 of 4')).toBeOnTheScreen();
  });

  it('draws one dot per step, four in all', async () => {
    const view = await renderUi(<OnboardingStepIndicator accessibilityLabel="Step 4 of 4" step={4} />);
    expect(view.getByTestId('onboarding-step-indicator').children).toHaveLength(4);
  });
});
