import { duration, spring as springToken } from '@quran/design-tokens';
import { renderHook } from '@testing-library/react-native';
import { FadeIn, FadeOut, SlideInDown, SlideOutDown, useReducedMotion } from 'react-native-reanimated';

import { easeOut, spring, timing, useSlideUp } from '@/core/theme';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
}));

const reducedMotion = jest.mocked(useReducedMotion);

describe('motion', () => {
  it.each(['instant', 'fast', 'standard', 'slow'] as const)('times %s fades from the duration token with ease-out', (speed) => {
    expect(timing(speed)).toEqual({ duration: duration[speed], easing: easeOut });
  });

  it('moves with a spring that settles without bouncing', () => {
    expect(spring()).toEqual({ dampingRatio: 1, duration: springToken.duration });
  });

  it('slides up from the bottom edge on the spring', async () => {
    reducedMotion.mockReturnValue(false);

    const { result } = await renderHook(() => useSlideUp());

    expect(result.current.entering).toBeInstanceOf(SlideInDown);
    expect(result.current.exiting).toBeInstanceOf(SlideOutDown);
  });

  it('fades instead of sliding when Reduce Motion is on', async () => {
    reducedMotion.mockReturnValue(true);

    const { result } = await renderHook(() => useSlideUp());

    expect(result.current.entering).toBeInstanceOf(FadeIn);
    expect(result.current.exiting).toBeInstanceOf(FadeOut);
  });
});
