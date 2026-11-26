import { act, fireEvent, screen } from '@testing-library/react-native';
import { GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import { getAnimatedStyle, setUpTests, useReducedMotion } from 'react-native-reanimated';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { TimelineCapsule } from './TimelineCapsule';

jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual<typeof import('react-native-gesture-handler')>('react-native-gesture-handler');
  return { ...actual, usePanGesture: jest.fn(actual.usePanGesture) };
});
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

setUpTests();

// Let the switch-in spring settle before the next test renders.
afterEach(async () => {
  jest.mocked(useReducedMotion).mockReturnValue(false);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
});

const label = 'كل الأعمار · ٢١١ حدثًا';

function capsule(onExpand = jest.fn()) {
  return (
    <GestureHandlerRootView>
      <TimelineCapsule accessibilityLabel={`إظهار الخط الزمني، ${label}`} label={label} onExpand={onExpand} />
    </GestureHandlerRootView>
  );
}

describe('TimelineCapsule', () => {
  it('names the focus and its events in a glass pill inside a 44 pt hit area', async () => {
    await renderUi(capsule());
    expect(screen.getByText(label)).toBeOnTheScreen();
    expect(flatStyle(screen.getByTestId('seerah-timeline-capsule').props.style)).toMatchObject({ minHeight: 44 });
    expect(flatStyle(screen.getByTestId('seerah-timeline-capsule-glass').props.style)).toMatchObject({ minHeight: 32 });
  });

  it('is a button that says it shows the timeline, with the focus, and expands on a tap', async () => {
    const onExpand = jest.fn();
    await renderUi(capsule(onExpand));
    fireEvent.press(screen.getByRole('button', { name: `إظهار الخط الزمني، ${label}` }));
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it('expands on a drag up past half the card, not on a short one', async () => {
    const onExpand = jest.fn();
    await renderUi(capsule(onExpand));
    const config = jest.mocked(usePanGesture).mock.lastCall?.[0] as unknown as { onDeactivate: (event: unknown) => void };
    await act(async () => config.onDeactivate({ translationY: -20, velocityY: 0 }));
    expect(onExpand).not.toHaveBeenCalled();
    await act(async () => config.onDeactivate({ translationY: -80, velocityY: 0 }));
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('sits at the trailing end, which React Native puts on the left in Arabic (%s)', async (locale) => {
    await renderUi(capsule(), { locale });
    expect(flatStyle(screen.getByTestId('seerah-timeline-capsule-dock').props.style)).toMatchObject({ alignItems: 'flex-end' });
  });

  it('slides in, and under Reduce Motion stays in place', async () => {
    const moving = await renderUi(capsule());
    const start = (getAnimatedStyle as unknown as (node: unknown) => { transform: { translateY: number }[] })(screen.getByTestId('seerah-timeline-capsule-dock'));
    // It starts 40 pt low and springs up.
    expect(start.transform[0]?.translateY).toBeGreaterThan(30);
    await moving.unmount();
    jest.mocked(useReducedMotion).mockReturnValue(true);
    await renderUi(capsule());
    expect(screen.getByTestId('seerah-timeline-capsule-dock')).toHaveAnimatedStyle({ transform: [{ translateY: 0 }] });
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/TimelineCapsule.tsx')).toEqual([]);
  });
});
