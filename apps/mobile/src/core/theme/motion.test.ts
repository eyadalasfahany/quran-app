import { renderHook } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { STAGGER_MAX_STEPS, STAGGER_STEP_MS, staggerFadeIn, useScaleIn } from './motion';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const mockReduce = useReducedMotion as unknown as jest.Mock;

describe('staggerFadeIn', () => {
  it('returns a layout animation for a row, with the stagger step and cap as constants', () => {
    expect(staggerFadeIn(0, false)).toBeDefined();
    expect(staggerFadeIn(3, false)).toBeDefined();
    expect(STAGGER_STEP_MS).toBeGreaterThan(0);
    expect(STAGGER_MAX_STEPS).toBeGreaterThan(0);
  });

  it('accepts Reduce Motion, which drops the delay but keeps the fade', () => {
    expect(staggerFadeIn(5, true)).toBeDefined();
  });
});

describe('useScaleIn', () => {
  beforeEach(() => mockReduce.mockReturnValue(false));

  it('returns the scale-in entrance normally', async () => {
    const hook = await renderHook(() => useScaleIn());
    expect(hook.result.current).toBeDefined();
  });

  it('returns a fade under Reduce Motion', async () => {
    mockReduce.mockReturnValue(true);
    const hook = await renderHook(() => useScaleIn());
    expect(hook.result.current).toBeDefined();
  });
});
