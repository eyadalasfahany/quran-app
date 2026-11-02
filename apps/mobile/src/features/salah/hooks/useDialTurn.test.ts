import { renderHook } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';

import { normalize360 } from './useQiblaHeading';
import { dialRotationFor, uprightRotationFor, useDialTurn } from './useDialTurn';

// The reaction is captured instead of run by Reanimated, so each step is driven here: the test writes a heading, then
// the prepare and react functions run as the UI thread would run them.
type CapturedReaction = { prepare: () => number; react: (value: number, previous: number | undefined) => void };
const capturedReactions: CapturedReaction[] = [];

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return {
    __esModule: true,
    ...actual,
    // The spring's shape is not under test: each step lands on its target, so the turn is asserted exactly.
    withSpring: (toValue: number) => toValue,
    default: actual.default,
    useAnimatedReaction: (prepare: () => number, react: (value: number, previous: number | undefined) => void) => {
      capturedReactions.push({ prepare, react });
    },
  };
});

/** Renders useDialTurn with its heading, and returns a `step` that runs one reaction, as Reanimated does on a change. */
async function renderDial(initialHeading: number, following: boolean) {
  capturedReactions.length = 0;
  const { result } = await renderHook(() => {
    const heading = useSharedValue(initialHeading);
    return { heading, turn: useDialTurn(heading, following) };
  });
  const reaction = captured(capturedReactions, capturedReactions.length - 1);
  let previous: number | undefined;
  const step = () => {
    const target = reaction.prepare();
    reaction.react(target, previous);
    previous = target;
  };
  return { ...result.current, step };
}

/** The entry at `index`, or a clear failure when the component did not register one. */
function captured<T>(list: T[], index: number): T {
  const item = list[index];
  if (item === undefined) {
    throw new Error(`expected a captured entry at ${index}`);
  }
  return item;
}

describe('dialRotationFor', () => {
  it.each([0, 90, 136, 244, 359, 1])('turns the face by −heading (heading %s)', (heading) => {
    expect(dialRotationFor(heading)).toBe(-heading);
  });

  it('keeps ش on true north when the phone faces east: the face turns the other way to the phone', () => {
    // Facing 90° (east), the face turns −90° so the north mark moves to the left (screen west).
    expect(dialRotationFor(90)).toBe(-90);
  });
});

describe('uprightRotationFor', () => {
  it.each([0, 45, 136, 359])('counter-rotates the labels by the same turn (turn %s)', (turn) => {
    expect(uprightRotationFor(turn)).toBe(turn);
    expect(uprightRotationFor(turn) + dialRotationFor(turn)).toBe(0);
  });
});

describe('useDialTurn', () => {
  it('follows the heading by the shortest turn, accumulating: 0 → 90 → 136 → 359 → 1 gives 0, 90, 136, −1, 1', async () => {
    const { heading, turn, step } = await renderDial(0, true);
    const expected = [0, 90, 136, -1, 1];

    [0, 90, 136, 359, 1].forEach((next, index) => {
      heading.value = next;
      step();

      expect(turn.value).toBe(expected[index]);
      // −1 and 359 are the same heading on the face: the turn lands on it, modulo 360.
      expect(normalize360(turn.value)).toBe(next);
    });
  });

  it('turns through north on the 359 → 1 wrap: a +2 step, not −358', async () => {
    const { heading, turn, step } = await renderDial(0, true);
    heading.value = 359;
    step();
    const atNorthWest = turn.value;

    heading.value = 1;
    step();

    expect(turn.value - atNorthWest).toBe(2);
  });

  it('stays at 0 (north-up) while not following, whatever the heading does', async () => {
    const { heading, turn, step } = await renderDial(136, false);
    expect(turn.value).toBe(0);

    for (const next of [0, 90, 136, 359, 1]) {
      heading.value = next;
      step();
      expect(turn.value).toBe(0);
    }
  });

  it('starts at 0 while following, before the first heading reaction lands', async () => {
    const { turn } = await renderDial(136, true);

    expect(turn.value).toBe(0);
  });
});
