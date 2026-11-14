import Svg from 'react-native-svg';

import { locales, renderUi, svgPaint } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import type { SeerahRouteKind } from '../types';
import { ROUTE_STYLE, RouteLine } from './RouteLine';

const D = 'M0,0 C10,10 20,10 30,0';

function line(kind: SeerahRouteKind, props: { scale?: number; dimmed?: boolean } = {}, locale: (typeof locales)[number] = 'ar') {
  return renderUi(
    <Svg height={50} width={50}>
      <RouteLine d={D} kind={kind} testID="route" {...props} />
    </Svg>,
    { locale },
  );
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
