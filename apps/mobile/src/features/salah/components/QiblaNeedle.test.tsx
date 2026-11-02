import { renderHook } from '@testing-library/react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { QiblaNeedle } from './QiblaNeedle';

/** A real SharedValue, so the animated style reads it on mount as it does in the app. */
async function sharedAt(initial: number): Promise<SharedValue<number>> {
  const { result } = await renderHook(() => useSharedValue(initial));
  return result.current;
}

function needleRotation(view: Awaited<ReturnType<typeof renderUi>>): number {
  const style = flatStyle(view.getByTestId('qibla-compass-needle').props.style);
  const rotate = (style.transform as { rotate: string }[]).find((t) => 'rotate' in t)?.rotate ?? '0deg';
  return Number(rotate.replace('deg', ''));
}

describe('QiblaNeedle', () => {
  it('turns by the qibla angle it is given', async () => {
    const view = await renderUi(<QiblaNeedle angle={await sharedAt(46)} />);

    expect(needleRotation(view)).toBe(46);
  });

  it('points at the marker when the angle is the bearing (not live)', async () => {
    const view = await renderUi(<QiblaNeedle angle={await sharedAt(244)} />);

    expect(needleRotation(view)).toBe(244);
  });

  it('is a non-interactive layer', async () => {
    const view = await renderUi(<QiblaNeedle angle={await sharedAt(10)} />);

    expect(view.getByTestId('qibla-compass-needle').props.pointerEvents).toBe('none');
  });

  it('takes a custom test id', async () => {
    const view = await renderUi(<QiblaNeedle angle={await sharedAt(10)} testID="custom-needle" />);

    expect(view.getByTestId('custom-needle')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/QiblaNeedle.tsx')).toEqual([]);
  });
});
