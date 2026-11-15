import { Text } from 'react-native';
import { makeMutable } from 'react-native-reanimated';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { MapAnchor } from './MapAnchor';

const values = (scale: number, tx = 0, ty = 0) => ({ scale: makeMutable(scale), tx: makeMutable(tx), ty: makeMutable(ty) });

describe('MapAnchor', () => {
  it.each(locales)('renders its children (%s)', async (locale) => {
    const view = await renderUi(
      <MapAnchor testID="anchor" values={values(1)} x={120} y={340}>
        <Text>child</Text>
      </MapAnchor>,
      { locale },
    );
    expect(view.getByText('child')).toBeOnTheScreen();
  });

  it.each([
    [0.5, 10, 20],
    [1, 0, 0],
    [2.4, -300, -150],
  ])('places the content point on screen at zoom %p, never scaling its children', async (scale, tx, ty) => {
    const view = await renderUi(
      <MapAnchor testID="anchor" values={values(scale, tx, ty)} x={120} y={340}>
        <Text>child</Text>
      </MapAnchor>,
    );
    const transform = flatStyle(view.getByTestId('anchor').props.style).transform as Record<string, number>[];
    expect(transform).toEqual([{ translateX: tx + 120 * scale }, { translateY: ty + 340 * scale }]);
  });

  it('is never zero-sized, so iOS keeps its pin in the accessibility tree', async () => {
    const view = await renderUi(
      <MapAnchor testID="anchor" values={values(1)} x={0} y={0}>
        <Text>child</Text>
      </MapAnchor>,
    );
    const style = flatStyle(view.getByTestId('anchor').props.style);
    expect(style.width).toBeGreaterThan(0);
    expect(style.height).toBeGreaterThan(0);
  });

  it('lets touches reach its children but never blocks the map under it', async () => {
    const view = await renderUi(
      <MapAnchor testID="anchor" values={values(1)} x={0} y={0}>
        <Text>child</Text>
      </MapAnchor>,
    );
    expect(view.getByTestId('anchor').props.pointerEvents).toBe('box-none');
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/MapAnchor.tsx')).toEqual([]);
  });
});
