import type { SharedValue } from 'react-native-reanimated';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { normalize180 } from '../data/qibla-math';

import { QiblaNeedle } from './QiblaNeedle';

// The reaction is captured instead of run by Reanimated, so each step is driven here: the test writes a heading, then
// the prepare and react functions run as the UI thread would run them. Under Jest the animated style is read at mount,
// so the driven target is asserted directly; the live rotation is covered by the QiblaCompass coincidence test.
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

/** A heading SharedValue the test can move: the needle reads `.value` on every reaction step. */
const headingBox = (value: number): SharedValue<number> => ({ value }) as unknown as SharedValue<number>;

function needleRotation(view: Awaited<ReturnType<typeof renderUi>>): number {
  const style = flatStyle(view.getByTestId('qibla-compass-needle').props.style);
  const rotate = (style.transform as { rotate: string }[]).find((t) => 'rotate' in t)?.rotate ?? '0deg';
  return Number(rotate.replace('deg', ''));
}

/** The entry at `index`, or a clear failure when the component did not register one. */
function captured<T>(list: T[], index: number): T {
  const item = list[index];
  if (item === undefined) {
    throw new Error(`expected a captured entry at ${index}`);
  }
  return item;
}

describe('QiblaNeedle', () => {
  it('rests on the marker when it is not following the heading', async () => {
    const view = await renderUi(<QiblaNeedle bearing={244} following={false} heading={headingBox(10)} />);

    expect(needleRotation(view)).toBe(244);
  });

  it('starts on the marker while following, before the first heading reaction lands', async () => {
    const view = await renderUi(<QiblaNeedle bearing={244} following heading={headingBox(244)} />);

    expect(needleRotation(view)).toBe(244);
  });

  it('targets normalize180(bearing − heading) for each heading in the step brief (0, 90, 136, 359, 1)', async () => {
    capturedReactions.length = 0;
    const heading = headingBox(0);
    await renderUi(<QiblaNeedle bearing={136} following heading={heading} />);
    const reaction = captured(capturedReactions, capturedReactions.length - 1);
    let previous: number | undefined;

    for (const next of [0, 90, 136, 359, 1]) {
      heading.value = next;
      const target = reaction.prepare();
      expect(target).toBe(normalize180(136 - next));
      reaction.react(target, previous);
      previous = target;
    }
  });

  it('is a non-interactive layer', async () => {
    const view = await renderUi(<QiblaNeedle bearing={10} following={false} heading={headingBox(0)} />);

    expect(view.getByTestId('qibla-compass-needle').props.pointerEvents).toBe('none');
  });

  it('takes a custom test id', async () => {
    const view = await renderUi(
      <QiblaNeedle bearing={10} following={false} heading={headingBox(0)} testID="custom-needle" />,
    );

    expect(view.getByTestId('custom-needle')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/QiblaNeedle.tsx')).toEqual([]);
  });
});
