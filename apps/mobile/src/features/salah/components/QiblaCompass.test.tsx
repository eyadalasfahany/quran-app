import { within } from '@testing-library/react-native';
import type { SharedValue } from 'react-native-reanimated';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { normalize180, normalize360 } from '../data/qibla-math';
import { dialRotationFor } from '../hooks/useDialTurn';

import { QiblaCompass } from './QiblaCompass';

// Reanimated's animated styles are read at mount only under Jest, so the live values are read from the SharedValues.
// The reactions are captured rather than run, and the test drives them. Both are recorded in mount order: QiblaCompass
// calls useFollowTarget for the dial turn first, then QiblaNeedle calls it for the needle.
type CapturedReaction = { prepare: () => number; react: (value: number, previous: number | undefined) => void };
const capturedReactions: CapturedReaction[] = [];
const capturedFollowValues: SharedValue<number>[] = [];

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    // The spring's shape is not under test: each step lands on its target, so the turn is asserted exactly.
    withSpring: (toValue: number) => toValue,
    useAnimatedReaction: (prepare: () => number, react: (value: number, previous: number | undefined) => void) => {
      capturedReactions.push({ prepare, react });
    },
  };
});

jest.mock('../hooks/useFollowTarget', () => {
  const actual = jest.requireActual<typeof import('../hooks/useFollowTarget')>('../hooks/useFollowTarget');
  return {
    ...actual,
    useFollowTarget: (...args: Parameters<typeof actual.useFollowTarget>) => {
      const value = actual.useFollowTarget(...args);
      capturedFollowValues.push(value);
      return value;
    },
  };
});

/** A heading SharedValue as useQiblaHeading provides it; the value is what the needle reads. */
const headingAt = (value: number): SharedValue<number> => ({ value }) as unknown as SharedValue<number>;

type Rendered = Awaited<ReturnType<typeof renderUi>>;

/** The rotation in degrees of a view's transform, from its (animated or static) style. */
function rotationOf(view: Rendered, testID: string): number {
  const style = flatStyle(view.getByTestId(testID).props.style);
  const rotate = (style.transform as { rotate: string }[]).find((t) => 'rotate' in t)?.rotate ?? '0deg';
  return Number(rotate.replace('deg', ''));
}

/** The needle's rotation in degrees as it was drawn at mount (the static layer, or the first animated frame). */
const needleRotation = (view: Rendered) => rotationOf(view, 'qibla-compass-needle');

/** Runs one reaction step, as Reanimated does when its prepared value changes. */
function driver(reaction: CapturedReaction) {
  let previous: number | undefined;
  return () => {
    const target = reaction.prepare();
    reaction.react(target, previous);
    previous = target;
  };
}

/** Renders the compass and returns its dial turn and needle, with their reactions driven one step at a time. */
async function renderDrivenCompass(bearing: number, heading: SharedValue<number>) {
  capturedReactions.length = 0;
  capturedFollowValues.length = 0;
  const view = await renderUi(<QiblaCompass aligned={false} bearing={bearing} heading={heading} live reduceMotion={false} />);
  const dialReaction = captured(capturedReactions, 0);
  const needleReaction = captured(capturedReactions, 1);
  const turn = captured(capturedFollowValues, 0);
  const needleAngle = captured(capturedFollowValues, 1);
  return {
    view,
    turn,
    needleAngle,
    needleReaction,
    stepDial: driver(dialReaction),
    stepNeedle: driver(needleReaction),
  };
}

/** The entry at `index`, or a clear failure when the component did not register one. */
function captured<T>(list: T[], index: number): T {
  const item = list[index];
  if (item === undefined) {
    throw new Error(`expected a captured entry at ${index}`);
  }
  return item;
}

/** The instrument's frame size (quran-app-screens.html, #Qibla). */
const DIAL = 336;

/** A host node of the rendered JSON tree, as toJSON() returns it. */
type HostNode = { props: { style?: unknown }; children: (HostNode | string)[] | null };

/** The first host node whose style carries a transform with a scale: the scaled instrument. */
function findScaledInstrument(node: HostNode | string | null | undefined): HostNode | null {
  if (!node || typeof node === 'string') {
    return null;
  }
  const transform = (flatStyle(node.props.style).transform ?? []) as Record<string, number>[];
  if (transform.some((t) => 'scale' in t)) {
    return node;
  }
  for (const child of node.children ?? []) {
    const found = findScaledInstrument(child);
    if (found) {
      return found;
    }
  }
  return null;
}

describe('QiblaCompass', () => {
  describe('scaled instrument (ADR 0036): the 336 frame is centred on the size box', () => {
    it.each([200, 300, 336])('centres the instrument at size %d, in ar and en', async (size) => {
      for (const locale of locales) {
        const view = await renderUi(
          <QiblaCompass aligned={false} bearing={244} heading={headingAt(0)} live={false} reduceMotion={false} size={size} />,
          { locale },
        );
        const instrument = findScaledInstrument(view.toJSON() as HostNode);
        expect(instrument).not.toBeNull();

        const style = flatStyle(instrument?.props.style);
        const transform = style.transform as Record<string, number>[];
        const translateX = transform.find((t) => 'translateX' in t)?.translateX ?? NaN;
        const translateY = transform.find((t) => 'translateY' in t)?.translateY ?? NaN;
        // The box is 336 wide with a `left: 0` anchor: its right edge in RTL, its left edge in LTR (see dialPlacement).
        const isRTL = locale === 'ar';
        const boxLeft = (isRTL ? size - DIAL : 0) + translateX;
        // Scaling is about the box centre, so the drawn centre is the box centre.
        expect(boxLeft + DIAL / 2).toBeCloseTo(size / 2, 5);
        expect(translateY + DIAL / 2).toBeCloseTo(size / 2, 5);
      }
    });
  });

  it('renders the dial with its a11y label in Arabic-Indic degrees', async () => {
    const view = await renderUi(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(0)} live={false} reduceMotion={false} />,
    );

    expect(view.getByLabelText('اتجاه القبلة: ٢٤٤ درجة')).toBeOnTheScreen();
  });

  it.each(locales)('keeps the a11y label in %s, stating the bearing', async (locale) => {
    const view = await renderUi(
      <QiblaCompass aligned={false} bearing={136} heading={headingAt(90)} live reduceMotion={false} />,
      { locale },
    );

    expect(view.getByLabelText(locale === 'ar' ? 'اتجاه القبلة: ١٣٦ درجة' : 'Qibla direction: 136 degrees')).toBeOnTheScreen();
  });

  it('draws the cardinals and the eight degree numerals', async () => {
    const view = await renderUi(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(0)} live={false} reduceMotion={false} />,
    );

    for (const cardinal of ['ش', 'ج', 'غ', 'ق']) {
      expect(view.getByText(cardinal)).toBeOnTheScreen();
    }
    for (const numeral of ['٣٠', '٦٠', '١٢٠', '١٥٠', '٢١٠', '٢٤٠', '٣٠٠', '٣٣٠']) {
      expect(view.getByText(numeral)).toBeOnTheScreen();
    }
  });

  it.each(locales)('localizes cardinals and numerals in %s', async (locale) => {
    const view = await renderUi(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(0)} live={false} reduceMotion={false} />,
      { locale },
    );

    const cardinals = locale === 'ar' ? ['ش', 'ج', 'غ', 'ق'] : ['N', 'S', 'W', 'E'];
    for (const cardinal of cardinals) {
      expect(view.getByText(cardinal)).toBeOnTheScreen();
    }
    expect(view.getByText(locale === 'ar' ? '٣٠' : '30')).toBeOnTheScreen();
  });

  it('parks the Kaaba marker on the arc at the bearing', async () => {
    const view = await renderUi(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(0)} live={false} reduceMotion={false} />,
    );

    expect(rotationOf(view, 'qibla-compass-marker')).toBe(244);
  });

  it('is the static north-up dial when there is no heading: the face does not turn and the needle rests on the marker', async () => {
    const view = await renderUi(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(0)} live={false} reduceMotion={false} />,
    );

    expect(rotationOf(view, 'qibla-compass-dial')).toBe(0);
    expect(needleRotation(view)).toBe(244);
  });

  it('is the static north-up dial under Reduce Motion, even with a live heading', async () => {
    const view = await renderUi(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(10)} live reduceMotion />,
    );

    expect(rotationOf(view, 'qibla-compass-dial')).toBe(0);
    expect(needleRotation(view)).toBe(244);
  });

  it('draws the lubber mark fixed at the top, outside the rotating face', async () => {
    const view = await renderUi(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(10)} live reduceMotion={false} />,
    );

    expect(view.getByTestId('qibla-compass-lubber', { includeHiddenElements: true })).toBeOnTheScreen();
    // The face is the rotating layer; the lubber is not inside it.
    expect(
      within(view.getByTestId('qibla-compass-dial')).queryByTestId('qibla-compass-lubber', { includeHiddenElements: true }),
    ).toBeNull();
  });

  it('the marker and the needle coincide on screen as the heading sweeps 0 → 90 → 136 → 359 → 1 (both reactions driven)', async () => {
    const bearing = 136;
    const heading = headingAt(0);
    const { turn, needleAngle, needleReaction, stepDial, stepNeedle } = await renderDrivenCompass(bearing, heading);

    for (const next of [0, 90, 136, 359, 1]) {
      heading.value = next;
      stepDial();
      stepNeedle();

      // The needle's target is the shortest turn to the qibla from the heading.
      expect(needleReaction.prepare()).toBe(normalize180(bearing - next));
      // The face turns by −turn, so the marker's screen angle is its bearing plus the face's rotation.
      const markerOnScreen = normalize360(bearing + dialRotationFor(turn.value));
      expect(markerOnScreen).toBeCloseTo(normalize360(needleAngle.value), 6);
    }
  });

  it('when the phone faces the qibla, the marker and the needle are both at the top of the screen', async () => {
    const bearing = 244;
    const heading = headingAt(0);
    const { turn, needleAngle, stepDial, stepNeedle } = await renderDrivenCompass(bearing, heading);

    heading.value = 244;
    stepDial();
    stepNeedle();

    expect(normalize360(bearing + dialRotationFor(turn.value))).toBeCloseTo(0, 6);
    expect(normalize360(needleAngle.value)).toBeCloseTo(0, 6);
  });

  it('draws the aligned halo only while aligned', async () => {
    const view = await renderUi(
      <QiblaCompass aligned bearing={244} heading={headingAt(244)} live reduceMotion={false} />,
    );

    expect(view.getByTestId('qibla-compass-aligned-halo')).toBeOnTheScreen();

    await view.rerender(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(100)} live reduceMotion={false} />,
    );
    expect(view.queryByTestId('qibla-compass-aligned-halo')).toBeNull();
  });

  it('keeps the Kaaba marker and dial labels when only the heading changes', async () => {
    const view = await renderUi(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(10)} live reduceMotion={false} />,
    );

    await view.rerender(
      <QiblaCompass aligned={false} bearing={244} heading={headingAt(90)} live reduceMotion={false} />,
    );

    expect(view.getByTestId('qibla-compass-marker')).toBeOnTheScreen();
    expect(view.getByText('ش')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/QiblaCompass.tsx')).toEqual([]);
  });
});
