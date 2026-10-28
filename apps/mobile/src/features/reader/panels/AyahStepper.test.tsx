import { fireEvent } from '@testing-library/react-native';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { AyahStepper } from './AyahStepper';

describe('AyahStepper', () => {
  it.each(['pill', 'split'] as const)('renders the %s with previous and next buttons', async (variant) => {
    const screen = await renderUi(<AyahStepper onNext={jest.fn()} onPrevious={jest.fn()} variant={variant} />, {
      locale: 'en',
    });

    expect(screen.getByRole('button', { name: 'Previous ayah' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Next ayah' })).toBeOnTheScreen();
  });

  it.each(['pill', 'split'] as const)('calls the handlers on press in the %s variant', async (variant) => {
    const onPrevious = jest.fn();
    const onNext = jest.fn();
    const screen = await renderUi(<AyahStepper onNext={onNext} onPrevious={onPrevious} variant={variant} />, {
      locale: 'en',
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Previous ayah' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Next ayah' }));

    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it.each(['pill', 'split'] as const)('disables a side with no handler in the %s variant', async (variant) => {
    const screen = await renderUi(<AyahStepper onNext={jest.fn()} variant={variant} />, { locale: 'en' });

    expect(screen.getByRole('button', { name: 'Previous ayah' }).props.accessibilityState).toEqual({ disabled: true });
    expect(screen.getByRole('button', { name: 'Next ayah' }).props.accessibilityState).toEqual({ disabled: false });
  });

  it('floats the pill above the bottom edge, centred, at the frame inset', async () => {
    const screen = await renderUi(<AyahStepper variant="pill" />, { locale: 'ar' });
    const bar = flatStyle(screen.getByTestId('ayah-stepper').props.style);

    expect(bar).toMatchObject({ bottom: themes.light.size.pillInset, position: 'absolute', alignItems: 'center' });
  });

  it('keeps the split buttons in a row with the frame gap and 48-point height', async () => {
    const screen = await renderUi(<AyahStepper variant="split" />, { locale: 'en' });

    expect(flatStyle(screen.getByTestId('ayah-stepper').props.style)).toMatchObject({ flexDirection: 'row' });
    expect(flatStyle(screen.getByTestId('ayah-stepper-next').props.style)).toMatchObject({
      minHeight: themes.light.size.controlHeight,
    });
  });

  it('draws the split buttons on a raised surface with a line border', async () => {
    const screen = await renderUi(<AyahStepper onNext={jest.fn()} variant="split" />, { locale: 'en' });

    expect(flatStyle(screen.getByTestId('ayah-stepper-next').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surfaceRaised,
      borderColor: themes.light.colors.line,
    });
  });

  it.each(locales)('lays the buttons out in %s', async (locale) => {
    const screen = await renderUi(<AyahStepper variant="pill" />, { locale });
    expect(screen.getByTestId('ayah-stepper-previous')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/panels/AyahStepper.tsx')).toEqual([]);
  });
});
