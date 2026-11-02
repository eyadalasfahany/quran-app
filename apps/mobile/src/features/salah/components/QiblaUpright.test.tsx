import { Text } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { QiblaUpright } from './QiblaUpright';

const turnAt = (value: number): SharedValue<number> => ({ value }) as unknown as SharedValue<number>;

function rotationOf(view: Awaited<ReturnType<typeof renderUi>>, testID: string): number {
  const style = flatStyle(view.getByTestId(testID).props.style);
  const rotate = (style.transform as { rotate: string }[]).find((t) => 'rotate' in t)?.rotate ?? '0deg';
  return Number(rotate.replace('deg', ''));
}

describe('QiblaUpright', () => {
  it('counter-rotates its children by the dial turn', async () => {
    const view = await renderUi(
      <QiblaUpright style={{ height: 22, width: 40 }} testID="upright" turn={turnAt(90)}>
        <Text>ش</Text>
      </QiblaUpright>,
    );

    expect(rotationOf(view, 'upright')).toBe(90);
    expect(view.getByText('ش')).toBeOnTheScreen();
  });

  it('is upright at rest (no turn)', async () => {
    const view = await renderUi(
      <QiblaUpright style={{ height: 22, width: 40 }} testID="upright" turn={turnAt(0)}>
        <Text>ج</Text>
      </QiblaUpright>,
    );

    expect(rotationOf(view, 'upright')).toBe(0);
  });

  it('keeps the caller’s position and size', async () => {
    const view = await renderUi(
      <QiblaUpright style={{ left: 12, position: 'absolute', top: 7 }} testID="upright" turn={turnAt(0)}>
        <Text>غ</Text>
      </QiblaUpright>,
    );

    const style = flatStyle(view.getByTestId('upright').props.style);
    expect(style.position).toBe('absolute');
    expect(style.left).toBe(12);
    expect(style.top).toBe(7);
  });

  it('takes no pointer events', async () => {
    const view = await renderUi(
      <QiblaUpright style={{}} testID="upright" turn={turnAt(0)}>
        <Text>ق</Text>
      </QiblaUpright>,
    );

    expect(view.getByTestId('upright').props.pointerEvents).toBe('none');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/QiblaUpright.tsx')).toEqual([]);
  });
});
