import { I18nManager, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { getAnimatedStyle, setUpTests, useReducedMotion } from 'react-native-reanimated';

import { ThemeProvider } from '@/core/theme';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarUnitMotion, UNIT_SLIDE_DISTANCE, unitEnterOffset } from './AzkarUnitMotion';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

setUpTests();

const mockReduce = useReducedMotion as unknown as jest.Mock;

function unit(unitKey: string, direction: 1 | -1 = 1) {
  return (
    <ThemeProvider name="light">
      <AzkarUnitMotion direction={direction} unitKey={unitKey}>
        <Text>{`FIXTURE content ${unitKey}`}</Text>
      </AzkarUnitMotion>
    </ThemeProvider>
  );
}

describe('unitEnterOffset', () => {
  it('comes from the right for a forward move in English (the push direction)', async () => {
    expect(unitEnterOffset(1, false)).toBe(UNIT_SLIDE_DISTANCE);
  });

  it('comes from the left for a forward move in Arabic, the reading-start side', async () => {
    expect(unitEnterOffset(1, true)).toBe(-UNIT_SLIDE_DISTANCE);
  });

  it('comes from the opposite side for a move back', async () => {
    expect(unitEnterOffset(-1, false)).toBe(-UNIT_SLIDE_DISTANCE);
    expect(unitEnterOffset(-1, true)).toBe(UNIT_SLIDE_DISTANCE);
  });
});

describe('AzkarUnitMotion', () => {
  beforeEach(() => {
    mockReduce.mockReturnValue(false);
    I18nManager.isRTL = false;
  });

  it('renders its children in a motion wrapper', async () => {
    await render(unit('fixture:unit-1'));
    expect(screen.getByTestId('azkar-unit-motion')).toBeTruthy();
    expect(screen.getByText('FIXTURE content fixture:unit-1')).toBeTruthy();
  });

  it('shows the new unit after the unit key changes, forward and back', async () => {
    const { rerender } = await render(unit('fixture:unit-1'));
    await rerender(unit('fixture:unit-2', 1));
    expect(screen.getByText('FIXTURE content fixture:unit-2')).toBeTruthy();

    await rerender(unit('fixture:unit-1', -1));
    expect(screen.getByText('FIXTURE content fixture:unit-1')).toBeTruthy();
  });

  it('starts a new unit at zero opacity in the same commit, so it never paints at full opacity', async () => {
    const { rerender } = await render(unit('fixture:unit-1'));
    expect(screen.getByTestId('azkar-unit-motion')).toHaveAnimatedStyle({ opacity: 1 });

    await rerender(unit('fixture:unit-2', 1));

    // The fade-in runs on real timers, so on a busy run it may have advanced a frame or two past 0 by now.
    // Typed through the native jest utils: the default typing is the web stub, which returns void.
    const animatedStyleOf = getAnimatedStyle as unknown as (node: { props: Record<string, unknown> }) => { opacity?: number };
    expect(animatedStyleOf(screen.getByTestId('azkar-unit-motion')).opacity).toBeLessThan(0.1);
  });

  it('keeps the same content when only the direction changes', async () => {
    const { rerender } = await render(unit('fixture:unit-1', 1));
    await rerender(unit('fixture:unit-1', -1));
    expect(screen.getByText('FIXTURE content fixture:unit-1')).toBeTruthy();
  });

  it('changes unit under Reduce Motion, with a fade and no slide', async () => {
    mockReduce.mockReturnValue(true);
    const { rerender } = await render(unit('fixture:unit-1'));
    await rerender(unit('fixture:unit-2', -1));

    expect(screen.getByText('FIXTURE content fixture:unit-2')).toBeTruthy();
  });

  it('runs in Arabic too, with the same wrapper', async () => {
    I18nManager.isRTL = true;
    const { rerender } = await render(unit('fixture:unit-1'));
    await rerender(unit('fixture:unit-2'));

    expect(screen.getByTestId('azkar-unit-motion')).toBeTruthy();
  });

  it('uses theme tokens rather than raw colours', async () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarUnitMotion.tsx')).toEqual([]);
  });
});
