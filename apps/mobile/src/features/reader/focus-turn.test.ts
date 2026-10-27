import { makeMutable, type EntryAnimationsValues, type ExitAnimationsValues } from 'react-native-reanimated';

import { FOCUS_TURN_TRAVEL, focusTurnAnimations, type FocusTurnDirection } from './focus-turn';

const enter = {} as EntryAnimationsValues;
const exit = {} as ExitAnimationsValues;

function translateY(values: Record<string, unknown>): unknown {
  return (values.transform as { translateY: unknown }[])[0]?.translateY;
}

describe('focusTurnAnimations', () => {
  it.each([
    [1, FOCUS_TURN_TRAVEL],
    [-1, -FOCUS_TURN_TRAVEL],
  ] as const)('brings the next ayah in from the side of the turn (%s)', (way, start) => {
    const { entering } = focusTurnAnimations(makeMutable<FocusTurnDirection>(way), false);

    const turn = entering(enter);
    expect(turn.initialValues).toMatchObject({ opacity: 0 });
    expect(translateY(turn.initialValues)).toBe(start);
  });

  it('sends the leaving ayah the other way from where it starts', () => {
    const { exiting } = focusTurnAnimations(makeMutable<FocusTurnDirection>(1), false);

    const turn = exiting(exit);
    expect(turn.initialValues).toMatchObject({ opacity: 1 });
    expect(translateY(turn.initialValues)).toBe(0);
    expect(turn.animations).toHaveProperty('opacity');
    expect(turn.animations).toHaveProperty('transform');
  });

  it('reads the direction when the turn runs, not when the ayah was drawn', () => {
    const direction = makeMutable<FocusTurnDirection>(1);
    const { entering } = focusTurnAnimations(direction, false);

    direction.value = -1;
    expect(translateY(entering(enter).initialValues)).toBe(-FOCUS_TURN_TRAVEL);
  });

  it('only cross-fades with Reduce Motion on', () => {
    const { entering } = focusTurnAnimations(makeMutable<FocusTurnDirection>(1), true);

    const turn = entering(enter);
    expect(turn.initialValues).toMatchObject({ opacity: 0 });
    expect(translateY(turn.initialValues)).toBe(0);
  });
});
