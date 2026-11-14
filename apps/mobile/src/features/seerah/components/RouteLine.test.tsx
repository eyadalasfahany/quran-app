import { renderHook } from '@testing-library/react-native';
import { setUpTests, useSharedValue, type SharedValue } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { locales, renderUi, svgPaint } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import type { SeerahRouteKind } from '../types';
import { ROUTE_STYLE, RouteLine, routeStroke } from './RouteLine';

setUpTests();

const D = 'M0,0 C10,10 20,10 30,0';

function Line({ kind, scale, dimmed }: { kind: SeerahRouteKind; scale: SharedValue<number>; dimmed?: boolean }) {
  return (
    <Svg height={50} width={50}>
      <RouteLine d={D} dimmed={dimmed} kind={kind} scale={scale} testID="route" />
    </Svg>
  );
}

async function sharedScale(initial: number): Promise<SharedValue<number>> {
  const { result } = await renderHook(() => useSharedValue(initial));
  return result.current;
}

function line(kind: SeerahRouteKind, props: { scale?: number; dimmed?: boolean } = {}, locale: (typeof locales)[number] = 'ar') {
  return sharedScale(props.scale ?? 1).then((scale) => renderUi(<Line dimmed={props.dimmed} kind={kind} scale={scale} />, { locale }));
}

describe('RouteLine', () => {
  it.each(locales)('draws the path (%s)', async (locale) => {
    const view = await line('hijra', {}, locale);
    expect(view.getByTestId('route-stroke').props.d).toBe(D);
    expect(view.getByTestId('route-halo').props.d).toBe(D);
  });

  it.each([
    ['hijra', themes.light.colors.brand],
    ['taif', themes.light.colors.brand],
    ['trip', themes.light.colors.inkMuted],
    ['habasha', themes.light.colors.chartBlue],
    ['ghazwa', themes.light.colors.gold],
  ] as const)('%s uses its token colour', async (kind, colour) => {
    const view = await line(kind);
    expect(view.getByTestId('route-stroke').props.stroke).toEqual(svgPaint(colour));
  });

  it('the Hijra is solid; the others are dashed or dotted', async () => {
    const solid = await line('hijra');
    expect(solid.getByTestId('route-stroke').props.strokeDasharray).toBeUndefined();
    await solid.unmount();
    for (const kind of ['taif', 'trip', 'habasha', 'ghazwa'] as const) {
      expect(ROUTE_STYLE[kind].dash).not.toBeNull();
    }
  });

  it('keeps its screen width at any zoom', async () => {
    const view = await line('hijra', { scale: 0.5 });
    expect(view.getByTestId('route-stroke').props.strokeWidth).toBe(ROUTE_STYLE.hijra.width / 0.5);
    expect(view.getByTestId('route-halo').props.strokeWidth).toBe((ROUTE_STYLE.hijra.width + 3) / 0.5);
  });

  it('computes the widths and dash from the zoom, as the UI thread does on each frame of a pinch', () => {
    expect(routeStroke('hijra', 0.25)).toEqual({ dash: undefined, halo: (ROUTE_STYLE.hijra.width + 3) / 0.25, width: ROUTE_STYLE.hijra.width / 0.25 });
    // A dotted trip: the dash is in units of the stroke width, so it too keeps its screen size.
    expect(routeStroke('trip', 0.5).dash).toBe(ROUTE_STYLE.trip.dash!.map((part) => (part / 0.5) * ROUTE_STYLE.trip.width).join(' '));
  });

  it('is drawn beneath a page-colour halo', async () => {
    const view = await line('ghazwa');
    expect(view.getByTestId('route-halo').props.stroke).toEqual(svgPaint(themes.light.colors.surfacePage));
  });

  it('fades when dimmed', async () => {
    const view = await line('hijra', { dimmed: true });
    expect(view.getByTestId('route').props.opacity).toBe(themes.light.opacity.focusAside);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/RouteLine.tsx')).toEqual([]);
  });
});
