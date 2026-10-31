import { fireEvent } from '@testing-library/react-native';

import { flatStyle, renderUi } from '../../../../jest/render-ui';

import { ScenePhoto } from './ScenePhoto';

const SOURCE = 1; // jest-expo maps asset requires to numbers

describe('ScenePhoto', () => {
  it('renders nothing measurable before layout', async () => {
    const view = await renderUi(<ScenePhoto focusY={0.5} source={SOURCE} testID="scene" />);

    expect(view.queryByTestId('scene-image')).toBeNull();
  });

  it('centre-crops at focus 0.5', async () => {
    const view = await renderUi(<ScenePhoto focusY={0.5} source={SOURCE} testID="scene" />);
    await fireEvent(view.getByTestId('scene'), 'onLayout', { nativeEvent: { layout: { width: 350, height: 56 } } });

    // drawn height = 350 × (787/1400) ≈ 196.8; overflow ≈ 140.8; top = -overflow × 0.5
    const image = view.getByTestId('scene-image');
    const style = flatStyle(image.props.style);
    expect(style.top).toBeCloseTo(-(350 * (787 / 1400) - 56) * 0.5, 0);
    expect(style.height).toBeCloseTo(350 * (787 / 1400), 0);
  });

  it('pins the photo bottom at focus 1 and its top at 0', async () => {
    const view = await renderUi(<ScenePhoto focusY={0.8} source={SOURCE} testID="scene" />);
    await fireEvent(view.getByTestId('scene'), 'onLayout', { nativeEvent: { layout: { width: 350, height: 56 } } });

    const overflow = 350 * (787 / 1400) - 56;
    expect(flatStyle(view.getByTestId('scene-image').props.style).top).toBeCloseTo(-overflow * 0.8, 0);

    await view.rerender(<ScenePhoto focusY={0} source={SOURCE} testID="scene" />);
    await fireEvent(view.getByTestId('scene'), 'onLayout', { nativeEvent: { layout: { width: 350, height: 56 } } });
    expect(flatStyle(view.getByTestId('scene-image').props.style).top).toBeCloseTo(0, 0);
  });

  it('is hidden from accessibility: the row around it carries the meaning', async () => {
    const view = await renderUi(<ScenePhoto focusY={0.5} source={SOURCE} testID="scene" />);
    expect(view.getByTestId('scene').props.accessible).toBeFalsy();
  });
});
