import { fireEvent } from '@testing-library/react-native';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { resetWindowSize, setWindowSize } from '../../../../jest/window-size';
import { MushafFullscreenExit } from './MushafFullscreenExit';

describe('MushafFullscreenExit', () => {
  afterEach(() => {
    resetWindowSize();
  });

  it('draws one exit button with the role and the label', async () => {
    const view = await renderUi(<MushafFullscreenExit onExit={() => undefined} />);

    const exit = view.getByTestId('mushaf-fullscreen-exit-button');
    expect(exit.props.accessibilityRole).toBe('button');
    expect(exit.props.accessibilityLabel).toBe('الخروج من ملء الشاشة');
    expect(view.getByTestId('mushaf-fullscreen-exit')).toBeOnTheScreen();
  });

  it('draws frosted glass so the disc is not mistaken for an ayah wash', async () => {
    const view = await renderUi(<MushafFullscreenExit onExit={() => undefined} />);

    const layer = view.getByTestId('mushaf-fullscreen-exit-button-glass');
    const [surface] = layer.children;
    const { colors, shadows } = themes.light;

    expect(flatStyle(typeof surface === 'object' ? surface.props.style : undefined)).toMatchObject({
      backgroundColor: colors.glassFill,
      borderColor: colors.glassStroke,
      boxShadow: shadows.glass,
    });
  });

  it('takes a custom testID for the row', async () => {
    const view = await renderUi(<MushafFullscreenExit onExit={() => undefined} testID="fullscreen-row" />);

    expect(view.getByTestId('fullscreen-row')).toBeOnTheScreen();
    expect(view.queryByTestId('mushaf-fullscreen-exit')).toBeNull();
  });

  it('sits at the end of the row, in the place of the enter button', async () => {
    const view = await renderUi(<MushafFullscreenExit onExit={() => undefined} />);

    const style = flatStyle(view.getByTestId('mushaf-fullscreen-exit').props.style);
    expect(style.justifyContent).toBe('flex-end');
    expect(style.paddingHorizontal).toBeUndefined();
  });

  it('pads the end by the pill inset and the space step on a compact window', async () => {
    const view = await renderUi(<MushafFullscreenExit onExit={() => undefined} />);

    const style = flatStyle(view.getByTestId('mushaf-fullscreen-exit').props.style);
    // space[4] (16) + TOOLBAR_PILL_INSET (2): no panel toggle follows the enter button.
    expect(style.paddingEnd).toBe(18);
  });

  it('pads the end further on an expanded window, past the panel toggle', async () => {
    setWindowSize(1024, 768);
    const view = await renderUi(<MushafFullscreenExit onExit={() => undefined} />);

    const style = flatStyle(view.getByTestId('mushaf-fullscreen-exit').props.style);
    // 16 + 2 + touch target (44) + 2 for the panel toggle that follows the enter button.
    expect(style.paddingEnd).toBe(64);
  });

  it('calls onExit when the button is pressed', async () => {
    const onExit = jest.fn();
    const view = await renderUi(<MushafFullscreenExit onExit={onExit} />);

    await fireEvent.press(view.getByTestId('mushaf-fullscreen-exit-button'));

    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('labels the exit in %s', async (locale) => {
    const view = await renderUi(<MushafFullscreenExit onExit={() => undefined} />, { locale });

    expect(view.getByLabelText(locale === 'ar' ? 'الخروج من ملء الشاشة' : 'Exit full screen')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/MushafFullscreenExit.tsx')).toEqual([]);
  });
});
