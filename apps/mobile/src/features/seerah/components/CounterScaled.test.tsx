import { Text } from 'react-native';
import { makeMutable } from 'react-native-reanimated';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { CounterScaled } from './CounterScaled';

describe('CounterScaled', () => {
  it.each(locales)('renders its children at the anchor (%s)', async (locale) => {
    const view = await renderUi(
      <CounterScaled scale={makeMutable(0.5)} testID="anchor" x={120} y={340}>
        <Text>child</Text>
      </CounterScaled>,
      { locale },
    );
    expect(view.getByText('child')).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('anchor').props.style)).toMatchObject({ left: 120, position: 'absolute', top: 340 });
  });

  it.each([
    [0.5, 2],
    [1, 1],
    [2, 0.5],
  ])('undoes a zoom of %p with a scale of %p', async (zoom, counter) => {
    const view = await renderUi(
      <CounterScaled scale={makeMutable(zoom)} testID="anchor" x={0} y={0}>
        <Text>child</Text>
      </CounterScaled>,
    );
    expect(flatStyle(view.getByTestId('anchor').props.style).transform).toEqual([{ scale: counter }]);
  });

  it('scales around its own anchor, never around its centre', async () => {
    const view = await renderUi(
      <CounterScaled scale={makeMutable(1)} testID="anchor" x={0} y={0}>
        <Text>child</Text>
      </CounterScaled>,
    );
    expect(flatStyle(view.getByTestId('anchor').props.style).transformOrigin).toBe('top left');
  });

  it('lets touches reach its children but never blocks the map under it', async () => {
    const view = await renderUi(
      <CounterScaled scale={makeMutable(1)} testID="anchor" x={0} y={0}>
        <Text>child</Text>
      </CounterScaled>,
    );
    expect(view.getByTestId('anchor').props.pointerEvents).toBe('box-none');
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/CounterScaled.tsx')).toEqual([]);
  });
});
