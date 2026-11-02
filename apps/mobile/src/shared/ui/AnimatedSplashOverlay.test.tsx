import * as SplashScreen from 'expo-splash-screen';
import { useReducedMotion } from 'react-native-reanimated';

import { renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { AnimatedSplashOverlay } from './AnimatedSplashOverlay';

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { ...actual, __esModule: true, default: actual.default, useReducedMotion: jest.fn(() => true) };
});

jest.mocked(useReducedMotion);

const hideAsync = jest.mocked(SplashScreen.hideAsync);

describe('AnimatedSplashOverlay', () => {
  beforeEach(() => {
    hideAsync.mockClear();
  });

  it('covers the screen and hides the native splash on layout', async () => {
    const view = await renderUi(<AnimatedSplashOverlay appReady={false} onFinished={() => undefined} />);
    const overlay = view.getByTestId('animated-splash-overlay');

    overlay.props.onLayout?.();
    expect(hideAsync).toHaveBeenCalledTimes(1);
  });

  it('calls onFinished when the app is ready and the draw completes', async () => {
    const onFinished = jest.fn();
    const view = await renderUi(<AnimatedSplashOverlay appReady onFinished={onFinished} />);

    view.getByTestId('animated-splash-overlay').props.onLayout?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(onFinished).toHaveBeenCalled();
  });

  it('has no raw colour literals in the mark component', () => {
    expect(rawColorLiterals('SplashBrandMark.tsx')).toEqual([]);
  });
});
