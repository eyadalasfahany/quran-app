import { renderHook } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';

import { useFollowTarget } from './useFollowTarget';

// The reaction is captured instead of run by Reanimated, so each step is driven here: the test changes a source, then the
// prepare and react functions run as the UI thread would run them. The spring is replaced by its target so the turn is
// asserted exactly; its shape is not under test.
type Prepare = (() => number) & { __closure?: Record<string, unknown> };
type CapturedReaction = { prepare: Prepare; react: (value: number, previous: number | undefined) => void };
const capturedReactions: CapturedReaction[] = [];

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    withSpring: (toValue: number) => toValue,
    useAnimatedReaction: (prepare: Prepare, react: (value: number, previous: number | undefined) => void) => {
      capturedReactions.push({ prepare, react });
    },
  };
});

/**
 * Whether Reanimated can reach `target` from a captured closure. Reanimated's extractInputs walks arrays and plain objects
 * only and does not look inside functions, so a SharedValue captured only inside a nested worklet is never subscribed.
 */
function reachableFromClosure(input: unknown, target: unknown): boolean {
  if (input === target) {
    return true;
  }
  if (Array.isArray(input)) {
    return input.some((item) => reachableFromClosure(item, target));
  }
  if (input !== null && typeof input === 'object' && Object.getPrototypeOf(input) === Object.prototype) {
    return Object.values(input).some((item) => reachableFromClosure(item, target));
  }
  return false;
}

/** The last reaction registered by the hook, or a clear failure when none was. */
function lastReaction(): CapturedReaction {
  const reaction = capturedReactions[capturedReactions.length - 1];
  if (reaction === undefined) {
    throw new Error('expected useAnimatedReaction to be called');
  }
  return reaction;
}

/**
 * Renders the hook with two sources (`source` is the first, `other` the second) that the test can move, and counts renders
 * so a test can prove a change lands with no re-render. `targetFor` reads the first source's value while following.
 */
async function renderFollow(options: { start: number; following: boolean; initial?: number; other?: number }) {
  const { start, following, initial = 0, other = 0 } = options;
  capturedReactions.length = 0;
  let renders = 0;
  const { result } = await renderHook(() => {
    renders += 1;
    const source = useSharedValue(start);
    const second = useSharedValue(other);
    const value = useFollowTarget(following, initial, [source, second], (follow, values) => {
      'worklet';
      return follow ? (values[0] ?? 0) : initial;
    });
    return { source, second, value };
  });
  let previous: number | undefined;
  const step = () => {
    const reaction = lastReaction();
    const target = reaction.prepare();
    reaction.react(target, previous);
    previous = target;
  };
  return { ...result.current, step, renders: () => renders };
}

describe('useFollowTarget', () => {
  it('subscribes every source through the prepare worklet closure, not inside targetFor', async () => {
    const { source, second } = await renderFollow({ start: 0, following: true });
    const { prepare } = lastReaction();

    expect(reachableFromClosure(prepare.__closure, source)).toBe(true);
    expect(reachableFromClosure(prepare.__closure, second)).toBe(true);
  });

  it('follows a source changed after mount, with no re-render', async () => {
    const { source, value, step, renders } = await renderFollow({ start: 0, following: true });
    const rendersAtMount = renders();

    source.value = 90;
    step();
    expect(value.value).toBe(90);

    source.value = 136;
    step();
    expect(value.value).toBe(136);
    expect(renders()).toBe(rendersAtMount);
  });

  it('turns the shortest way round a wrap: 359 → 1 is +2, not −358', async () => {
    const { source, value, step } = await renderFollow({ start: 359, following: true, initial: 359 });
    step();

    source.value = 1;
    step();

    expect(value.value - 359).toBe(2);
  });

  it('snaps to the rest value without animation while not following, whatever the source does', async () => {
    const { source, value, step } = await renderFollow({ start: 136, following: false, initial: 0 });

    source.value = 90;
    step();

    expect(value.value).toBe(0);
  });

  it('hands targetFor the source values in the order given', async () => {
    const { source, second } = await renderFollow({ start: 10, following: true, other: 20 });
    const reaction = lastReaction();

    source.value = 30;
    second.value = 40;

    // targetFor returns values[0], so the prepared target is the first source's live value.
    expect(reaction.prepare()).toBe(30);
  });
});
