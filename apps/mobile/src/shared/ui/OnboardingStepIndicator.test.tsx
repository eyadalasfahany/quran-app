import { renderUi } from '../../../jest/render-ui';

import { OnboardingStepIndicator } from './OnboardingStepIndicator';

describe('OnboardingStepIndicator', () => {
  it('exposes step progress to accessibility', async () => {
    const view = await renderUi(<OnboardingStepIndicator accessibilityLabel="Step 2 of 3" step={2} />);
    expect(view.getByLabelText('Step 2 of 3')).toBeOnTheScreen();
  });
});
