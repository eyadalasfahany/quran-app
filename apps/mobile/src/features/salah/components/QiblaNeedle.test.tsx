import type { SharedValue } from 'react-native-reanimated';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { QiblaNeedle } from './QiblaNeedle';

// The reanimated Jest mock freezes animated styles at render. The live spring is therefore covered by the
// needleAngleFor and shortestTurn unit tests; here the static rest position and the wiring are asserted.
const headingAt = (value: number): SharedValue<number> => ({ value }) as unknown as SharedValue<number>;

function needleRotation(view: Awaited<ReturnType<typeof renderUi>>): number {
  const style = flatStyle(view.getByTestId('qibla-compass-needle').props.style);
  const rotate = (style.transform as { rotate: string }[]).find((t) => 'rotate' in t)?.rotate ?? '0deg';
  return Number(rotate.replace('deg', ''));
}

describe('QiblaNeedle', () => {
  it('rests on the marker when it is not following the heading', async () => {
    const view = await renderUi(<QiblaNeedle bearing={244} following={false} heading={headingAt(10)} />);

    expect(needleRotation(view)).toBe(244);
  });

  it('starts on the marker while following, before the first heading reaction lands', async () => {
    const view = await renderUi(<QiblaNeedle bearing={244} following heading={headingAt(244)} />);

    expect(needleRotation(view)).toBe(244);
  });

  it('is a non-interactive layer', async () => {
    const view = await renderUi(<QiblaNeedle bearing={10} following={false} heading={headingAt(0)} />);

    expect(view.getByTestId('qibla-compass-needle').props.pointerEvents).toBe('none');
  });

  it('takes a custom test id', async () => {
    const view = await renderUi(
      <QiblaNeedle bearing={10} following={false} heading={headingAt(0)} testID="custom-needle" />,
    );

    expect(view.getByTestId('custom-needle')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/QiblaNeedle.tsx')).toEqual([]);
  });
});
