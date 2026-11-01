import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { MISBAHA_GOAL_MAX, MISBAHA_GOAL_MIN } from '../data/goals';
import { MisbahaTargetStepper } from './MisbahaTargetStepper';

describe('MisbahaTargetStepper', () => {
  it('shows the label and the value in Arabic digits', async () => {
    const view = await renderUi(
      <MisbahaTargetStepper label="عدد التسبيحات" onDecrease={jest.fn()} onIncrease={jest.fn()} value={100} />,
    );

    expect(view.getByText('عدد التسبيحات')).toBeOnTheScreen();
    expect(view.getByTestId('misbaha-target-stepper-value')).toHaveTextContent('١٠٠');
  });

  it('steps down and up from its buttons', async () => {
    const onDecrease = jest.fn();
    const onIncrease = jest.fn();
    const view = await renderUi(
      <MisbahaTargetStepper label="عدد التسبيحات" onDecrease={onDecrease} onIncrease={onIncrease} value={100} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'تقليل' }));
    await fireEvent.press(view.getByRole('button', { name: 'زيادة' }));

    expect(onDecrease).toHaveBeenCalledTimes(1);
    expect(onIncrease).toHaveBeenCalledTimes(1);
  });

  it('disables the down button at the lowest value and the up button at the highest', async () => {
    const low = await renderUi(
      <MisbahaTargetStepper label="x" onDecrease={jest.fn()} onIncrease={jest.fn()} value={MISBAHA_GOAL_MIN} />,
    );
    expect(low.getByRole('button', { name: 'تقليل' })).toBeDisabled();
    expect(low.getByRole('button', { name: 'زيادة' })).toBeEnabled();

    const high = await renderUi(
      <MisbahaTargetStepper label="x" onDecrease={jest.fn()} onIncrease={jest.fn()} value={MISBAHA_GOAL_MAX} />,
    );
    expect(high.getByRole('button', { name: 'زيادة' })).toBeDisabled();
  });

  it('reads in English', async () => {
    const view = await renderUi(
      <MisbahaTargetStepper label="Counts per day" onDecrease={jest.fn()} onIncrease={jest.fn()} value={33} />,
      { locale: 'en' },
    );

    expect(view.getByTestId('misbaha-target-stepper-value')).toHaveTextContent('33');
    expect(view.getByRole('button', { name: 'Decrease' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'Increase' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/daily-goals/components/MisbahaTargetStepper.tsx')).toEqual([]);
  });
});
