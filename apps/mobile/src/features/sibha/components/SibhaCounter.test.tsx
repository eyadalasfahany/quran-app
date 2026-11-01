import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { SibhaCounter } from './SibhaCounter';

describe('SibhaCounter', () => {
  it('shows the count in Arabic digits with its target under it', async () => {
    const view = await renderUi(<SibhaCounter count={33} onReset={jest.fn()} onTap={jest.fn()} target={100} />);

    expect(view.getByTestId('sibha-counter-count')).toHaveTextContent('٣٣');
    expect(view.getByText('من ١٠٠')).toBeOnTheScreen();
  });

  it('shows only the count when there is no target', async () => {
    const view = await renderUi(<SibhaCounter count={7} onReset={jest.fn()} onTap={jest.fn()} target={null} />);

    expect(view.getByTestId('sibha-counter-count')).toHaveTextContent('٧');
    expect(view.queryByText(/من/)).toBeNull();
  });

  it('draws the ring to half at half the target', async () => {
    const circumference = 2 * Math.PI * ((280 - 10) / 2);
    const view = await renderUi(<SibhaCounter count={50} onReset={jest.fn()} onTap={jest.fn()} target={100} />);

    expect(view.getByTestId('sibha-counter-ring').props.strokeDashoffset).toBeCloseTo(circumference / 2, 5);
  });

  it('stops at a full ring once the target is passed', async () => {
    const view = await renderUi(<SibhaCounter count={150} onReset={jest.fn()} onTap={jest.fn()} target={100} />);

    // The host drops a zero dash offset, so a full ring reads as no offset.
    expect(Number(view.getByTestId('sibha-counter-ring').props.strokeDashoffset ?? 0)).toBe(0);
  });

  it('leaves the ring empty without a target', async () => {
    const radius = (280 - 10) / 2;
    const circumference = 2 * Math.PI * radius;
    const view = await renderUi(<SibhaCounter count={50} onReset={jest.fn()} onTap={jest.fn()} target={null} />);

    expect(view.getByTestId('sibha-counter-ring').props.strokeDashoffset).toBeCloseTo(circumference, 5);
  });

  it('counts a tap on the counter itself', async () => {
    const onTap = jest.fn();
    const view = await renderUi(<SibhaCounter count={0} onReset={jest.fn()} onTap={onTap} target={33} />);

    await fireEvent.press(view.getByRole('button', { name: 'العداد' }));

    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('exposes the counter as a button with its value and a reset action', async () => {
    const onReset = jest.fn();
    const view = await renderUi(<SibhaCounter count={33} onReset={onReset} onTap={jest.fn()} target={100} />);

    const counter = view.getByRole('button', { name: 'العداد' });
    expect(counter.props.accessibilityValue).toEqual({ text: '٣٣ من ١٠٠' });
    expect(counter.props.accessibilityHint).toBe('اضغط للعدّ');

    await fireEvent(counter, 'accessibilityAction', { nativeEvent: { actionName: 'reset' } });
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('reads the value in English with Western digits', async () => {
    const view = await renderUi(<SibhaCounter count={33} onReset={jest.fn()} onTap={jest.fn()} target={100} />, {
      locale: 'en',
    });

    expect(view.getByTestId('sibha-counter-count')).toHaveTextContent('33');
    expect(view.getByText('of 100')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'Counter' }).props.accessibilityValue).toEqual({ text: '33 of 100' });
  });

  it('shows no rounds pill while no round is complete', async () => {
    const view = await renderUi(<SibhaCounter count={5} onReset={jest.fn()} onTap={jest.fn()} rounds={0} target={33} />);

    expect(view.queryByTestId('sibha-counter-rounds')).toBeNull();
    expect(view.getByRole('button', { name: 'العداد' }).props.accessibilityValue).toEqual({ text: '٥ من ٣٣' });
  });

  it('shows the completed rounds above the count, and in the counter value', async () => {
    const view = await renderUi(<SibhaCounter count={5} onReset={jest.fn()} onTap={jest.fn()} rounds={2} target={33} />);

    expect(view.getByText('الدورة ٢')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'العداد' }).props.accessibilityValue).toEqual({
      text: '٥ من ٣٣، الدورة ٢',
    });
  });

  it('hides the rounds without a target, since no target means no rounds', async () => {
    const view = await renderUi(<SibhaCounter count={40} onReset={jest.fn()} onTap={jest.fn()} rounds={3} target={null} />);

    expect(view.queryByTestId('sibha-counter-rounds')).toBeNull();
    expect(view.getByRole('button', { name: 'العداد' }).props.accessibilityValue).toEqual({ text: '٤٠' });
  });

  it('reads the round in English', async () => {
    const view = await renderUi(<SibhaCounter count={1} onReset={jest.fn()} onTap={jest.fn()} rounds={1} target={99} />, {
      locale: 'en',
    });

    expect(view.getByText('Round 1')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'Counter' }).props.accessibilityValue).toEqual({
      text: '1 of 99, round 1',
    });
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/sibha/components/SibhaCounter.tsx')).toEqual([]);
  });
});

describe('SibhaCounter size (ADR 0036)', () => {
  it('draws the ring and its button at the size it is given', async () => {
    const view = await renderUi(<SibhaCounter count={33} onReset={jest.fn()} onTap={jest.fn()} size={200} target={100} />);

    expect(flatStyle(view.getByTestId('sibha-counter').props.style)).toMatchObject({ height: 200, width: 200 });
    const radius = (200 - 10) / 2;
    expect(view.getByTestId('sibha-counter-ring').props.strokeDashoffset).toBeCloseTo(2 * Math.PI * radius * (1 - 0.33), 5);
  });

  it('scales the count with the ring, so it still fits a small ring', async () => {
    const view = await renderUi(<SibhaCounter count={33} onReset={jest.fn()} onTap={jest.fn()} size={160} target={100} />);

    // 120 × 160 / 280, rounded.
    expect(flatStyle(view.getByTestId('sibha-counter-count').props.style).fontSize).toBe(69);
  });

  it('keeps the frame size of 280 and a 120 count by default', async () => {
    const view = await renderUi(<SibhaCounter count={33} onReset={jest.fn()} onTap={jest.fn()} target={100} />);

    expect(flatStyle(view.getByTestId('sibha-counter').props.style)).toMatchObject({ height: 280, width: 280 });
    expect(flatStyle(view.getByTestId('sibha-counter-count').props.style).fontSize).toBe(120);
  });
});
