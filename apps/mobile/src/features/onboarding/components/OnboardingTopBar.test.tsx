import { fireEvent, screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { OnboardingTopBar } from './OnboardingTopBar';

describe('OnboardingTopBar', () => {
  it.each(locales)('points Back to the leading edge with a left chevron, mirrored in RTL (%s)', async (locale) => {
    await renderUi(<OnboardingTopBar backLabel="Back" onBack={jest.fn()} skipLabel="Skip" />, { locale });
    const icon = screen.getByTestId('onboarding-back-icon', { includeHiddenElements: true });
    const [symbol] = icon.children;

    expect(typeof symbol === 'object' ? symbol.props.name : undefined).toBe('chevron.left'); // the iOS symbol the simulator draws
    expect(flatStyle(icon.props.style).transform).toEqual(locale === 'ar' ? [{ scaleX: -1 }] : undefined);
  });

  it('calls onBack when Back is pressed', async () => {
    const onBack = jest.fn();
    await renderUi(<OnboardingTopBar backLabel="Back" onBack={onBack} skipLabel="Skip" />, { locale: 'en' });

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows the skip action in the trailing slot when given', async () => {
    const onSkip = jest.fn();
    await renderUi(<OnboardingTopBar backLabel="Back" onBack={jest.fn()} onSkip={onSkip} skipLabel="Skip" />, {
      locale: 'en',
    });

    fireEvent.press(screen.getByTestId('onboarding-skip'));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('leaves the leading slot empty without a back handler', async () => {
    await renderUi(<OnboardingTopBar backLabel="Back" skipLabel="Skip" />, { locale: 'en' });

    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    expect(flatStyle(screen.getByTestId('onboarding-top-bar').props.style).flexDirection).toBe('row');
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/onboarding/components/OnboardingTopBar.tsx')).toEqual([]);
  });
});
