import { act, fireEvent, screen } from '@testing-library/react-native';
import { usePanGesture, usePinchGesture } from 'react-native-gesture-handler';
import { advanceAnimationByTime, getAnimatedStyle, setUpTests, useReducedMotion } from 'react-native-reanimated';

import { flatStyle, locales } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderGesture } from '../../../../jest/seerah-ui';

import { makePin, regionLevelFixture } from '../fixtures';
import { focusView } from '../logic';
import type { SeerahMapPin } from '../types';
import { SeerahMap, type SeerahMapProps } from './SeerahMap';

jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual<typeof import('react-native-gesture-handler')>('react-native-gesture-handler');
  return { ...actual, usePanGesture: jest.fn(actual.usePanGesture), usePinchGesture: jest.fn(actual.usePinchGesture) };
});

setUpTests();

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const ART = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
const hidden = { includeHiddenElements: true } as const;

const madinah = makePin({ count: 56, labelPriority: 100, name: 'المدينة', opensLevel: 'madinah', placeId: 'madinah', x: 878, y: 1053.3 });
const makkah = makePin({ count: 60, labelPriority: 100, name: 'مكة', opensLevel: 'makkah', placeId: 'makkah', x: 897.7, y: 1357.8 });
const badr = makePin({
  ageMax: 54,
  ageMin: 54,
  count: 1,
  eventTitle: '[عنوان الفصل في الكتاب]',
  labelPriority: 80,
  labelSide: 'start',
  name: 'بدر',
  placeId: 'badr',
  x: 803,
  y: 1122,
});

type Callbacks = Pick<SeerahMapProps, 'onBackToRegion' | 'onCityOpen' | 'onOtherPress' | 'onPinPress'>;

async function mountMap(pins: SeerahMapPin[], props: Partial<SeerahMapProps> = {}, locale: (typeof locales)[number] = 'ar') {
  const callbacks: Callbacks = { onBackToRegion: jest.fn(), onCityOpen: jest.fn(), onOtherPress: jest.fn(), onPinPress: jest.fn() };
  const view = await renderGesture(
    <SeerahMap
      areaLabels={regionLevelFixture.areaLabels}
      art={ART}
      levelId="region"
      otherCount={0}
      pins={pins}
      routePaths={regionLevelFixture.routePaths}
      viewbox={regionLevelFixture.viewbox}
      zoom={regionLevelFixture.zoom}
      {...callbacks}
      {...props}
    />,
    { locale },
  );
  await act(async () => {
    fireEvent(screen.getByTestId('seerah-map'), 'layout', { nativeEvent: { layout: { height: 844, width: 390, x: 0, y: 0 } } });
  });
  await flushArt();
  return { ...callbacks, view };
}

/** The art, pins and routes mount a frame after the map's frame (see SeerahMap): let that frame pass. */
async function flushArt() {
  await act(async () => {
    if ('clock' in setTimeout) {
      jest.advanceTimersByTime(50);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });
}

type GestureCallbacks = { onActivate: (e?: unknown) => void; onUpdate: (e: unknown) => void; onDeactivate: (e: unknown) => void };

function gestures() {
  const pan = jest.mocked(usePanGesture).mock.lastCall?.[0] as unknown as GestureCallbacks;
  const pinch = jest.mocked(usePinchGesture).mock.lastCall?.[0] as unknown as GestureCallbacks;
  return { pan, pinch };
}

beforeEach(() => {
  jest.mocked(usePanGesture).mockClear();
  jest.mocked(usePinchGesture).mockClear();
  jest.mocked(useReducedMotion).mockReturnValue(false);
});

describe('SeerahMap', () => {
  it.each(locales)('draws the pins with their labels (%s)', async (locale) => {
    await mountMap([madinah, makkah, badr], {}, locale);
    expect(screen.getByTestId('seerah-map-pin-madinah')).toBeOnTheScreen();
    expect(screen.getByTestId('seerah-map-pin-makkah')).toBeOnTheScreen();
    expect(screen.getByTestId('seerah-map-pin-badr')).toBeOnTheScreen();
    expect(screen.getByTestId('seerah-map-label-madinah', hidden)).toBeOnTheScreen();
  });

  it('labels a city pin with the place, the count, the years and that it opens a map', async () => {
    await mountMap([madinah, makkah]);
    expect(screen.getByRole('button', { name: /المدينة، ٥٦ حدثًا، عمره ٤٠–٥٠ سنة، تفتح خريطة المدينة/ })).toBeOnTheScreen();
  });

  it('labels a single event with its title and age, and the title is its map label', async () => {
    await mountMap([madinah, makkah, badr]);
    expect(screen.getByRole('button', { name: '[عنوان الفصل في الكتاب]، عمره ٥٤ سنة' })).toBeOnTheScreen();
    expect(screen.getByText('[عنوان الفصل في الكتاب]', hidden)).toBeOnTheScreen();
  });

  it('a tap on a city opens its map and a tap on an event reports the place and the zoom', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const { onCityOpen, onPinPress } = await mountMap([madinah, makkah, badr]);
    await press(screen.getByTestId('seerah-map-pin-badr'));
    expect(onPinPress).toHaveBeenCalledWith('badr', 0.6);
    await press(screen.getByTestId('seerah-map-pin-madinah'));
    expect(onCityOpen).toHaveBeenCalledWith('madinah', 'madinah');
  });

  it('a city with one event still opens its map on a tap', async () => {
    const city = makePin({ count: 1, eventTitle: 'حدث واحد', name: 'المدينة', opensLevel: 'madinah', placeId: 'madinah', x: 878, y: 1053.3 });
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const { onCityOpen, onPinPress } = await mountMap([city]);
    await press(screen.getByTestId('seerah-map-pin-madinah'));
    expect(onCityOpen).toHaveBeenCalledWith('madinah', 'madinah');
    expect(onPinPress).not.toHaveBeenCalled();
  });

  it('a place with several events and no map reports the tap to the screen', async () => {
    const { onPinPress } = await mountMap([makePin({ count: 5, name: 'بدر', opensLevel: null, placeId: 'badr', x: 803, y: 1122 })]);
    await press(screen.getByTestId('seerah-map-pin-badr'));
    expect(onPinPress).toHaveBeenCalledWith('badr', 0.6);
  });

  it('merges two pins closer than 44 pt into one cluster that zooms in', async () => {
    // 0.6 pt per unit: 40 units are 24 pt apart.
    const a = makePin({ count: 2, name: 'أ', opensLevel: null, placeId: 'a', x: 878, y: 1000 });
    const b = makePin({ count: 3, name: 'ب', opensLevel: null, placeId: 'b', x: 918, y: 1000 });
    const { onPinPress } = await mountMap([a, b]);
    expect(screen.queryByTestId('seerah-map-pin-a')).toBeNull();
    const cluster = screen.getByRole('button', { name: '٢ مواضع متقاربة، ٥ أحداث. يكبّر الخريطة' });
    await press(cluster);
    expect(onPinPress).not.toHaveBeenCalled();
    // Zoomed in, the two are far enough apart to stand alone.
    expect(screen.getByTestId('seerah-map-pin-a')).toBeOnTheScreen();
    expect(screen.getByTestId('seerah-map-pin-b')).toBeOnTheScreen();
  });

  it('keeps two pins that are 44 pt or more apart separate', async () => {
    const a = makePin({ count: 2, name: 'أ', opensLevel: null, placeId: 'a', x: 878, y: 1000 });
    const b = makePin({ count: 3, name: 'ب', opensLevel: null, placeId: 'b', x: 878 + 44 / 0.6 + 1, y: 1000 });
    await mountMap([a, b]);
    expect(screen.getByTestId('seerah-map-pin-a')).toBeOnTheScreen();
    expect(screen.getByTestId('seerah-map-pin-b')).toBeOnTheScreen();
  });

  it('moves the label that collides to the other side of its pin and keeps the stronger one in place', async () => {
    // Not 44 pt apart in a line, so they stay separate pins, but the weak label runs into the strong one.
    const strong = makePin({ count: 2, labelPriority: 90, name: 'اسم طويل جدا للموضع القوي', opensLevel: null, placeId: 'strong', x: 878, y: 1000 });
    const weak = makePin({ count: 2, labelPriority: 10, name: 'اسم طويل جدا للموضع الضعيف', opensLevel: null, placeId: 'weak', x: 878 - 50 / 0.6, y: 1000 + 30 / 0.6 });
    await mountMap([strong, weak]);
    expect(screen.getByTestId('seerah-map-label-strong', hidden)).toBeOnTheScreen();
    // `end` is the default side; the weak label now sits on the start side (right-aligned, left of its pin).
    expect(flatStyle(screen.getByTestId('seerah-map-label-weak', hidden).props.style)).toMatchObject({ alignItems: 'flex-end' });
    expect(screen.getByTestId('seerah-map-pin-weak')).toBeOnTheScreen();
  });

  it('turns a region beyond the window into an edge chip that pans there', async () => {
    const sham = makePin({ count: 7, kind: 'region', name: 'الشام', opensLevel: null, placeId: 'sham', x: 878, y: 100 });
    await mountMap([madinah, makkah, sham]);
    expect(screen.queryByTestId('seerah-map-pin-sham')).toBeNull();
    const chip = screen.getByRole('button', { name: 'الشام، ٧ أحداث، خارج الشاشة شمالًا' });
    expect(chip.props.accessibilityHint).toBe('اضغط للانتقال');
    await press(chip);
    expect(screen.queryByTestId('seerah-map-edge-sham')).toBeNull();
    expect(screen.getByTestId('seerah-map-pin-sham')).toBeOnTheScreen();
  });

  it('draws the «أخرى» chip only when events have no place, and reports its tap', async () => {
    const none = await mountMap([madinah]);
    expect(screen.queryByTestId('seerah-map-other')).toBeNull();
    await none.view.unmount();
    const { onOtherPress } = await mountMap([madinah], { otherCount: 14 });
    await press(screen.getByRole('button', { name: 'أخرى: أحداث لم يذكر الكتاب مكانها، ١٤ حدثًا' }));
    expect(onOtherPress).toHaveBeenCalledTimes(1);
  });

  it('a dimmed pin is out of the accessibility order but still drawn', async () => {
    await mountMap([madinah, makkah, { ...badr, dimmed: true }]);
    expect(screen.queryByRole('button', { name: /عمره ٥٤/ })).toBeNull();
    expect(screen.getByTestId('seerah-map-pin-badr', hidden)).toBeOnTheScreen();
  });

  it('a pinch into a city opens its map', async () => {
    const { onCityOpen } = await mountMap([madinah]);
    await act(async () => {
      gestures().pinch.onUpdate({ focalX: 195, focalY: 422, scaleChange: 4 });
    });
    await act(async () => {
      gestures().pinch.onDeactivate({});
    });
    expect(onCityOpen).toHaveBeenCalledWith('madinah', 'madinah');
  });

  it('a pinch that stays under the city threshold opens nothing', async () => {
    const { onCityOpen } = await mountMap([madinah]);
    await act(async () => {
      gestures().pinch.onUpdate({ focalX: 195, focalY: 422, scaleChange: 2 });
    });
    await act(async () => {
      gestures().pinch.onDeactivate({});
    });
    expect(onCityOpen).not.toHaveBeenCalled();
  });

  it('on a city map, pinching out to the minimum asks for the region', async () => {
    const landmark = makePin({ count: 1, eventTitle: 'x', kind: 'landmark', name: 'الكعبة', opensLevel: null, placeId: 'makkah.kaaba', x: 730, y: 760 });
    const { onBackToRegion } = await mountMap([landmark], {
      viewbox: [0, 0, 1600, 1500],
      zoom: { cityThreshold: null, default: 0.6, fanOut: 2.2, max: 3, min: 0.39 },
    });
    await act(async () => {
      gestures().pinch.onUpdate({ focalX: 195, focalY: 422, scaleChange: 0.1 });
    });
    await act(async () => {
      gestures().pinch.onDeactivate({});
    });
    expect(onBackToRegion).toHaveBeenCalledTimes(1);
  });

  it('a pan keeps every pin on its content point and commits when it ends', async () => {
    const { onCityOpen } = await mountMap([madinah, makkah]);
    await act(async () => {
      gestures().pan.onUpdate({ changeX: -30, changeY: 20 });
    });
    await act(async () => {
      gestures().pan.onDeactivate({});
    });
    expect(screen.getByTestId('seerah-map-pin-madinah')).toBeOnTheScreen();
    expect(onCityOpen).not.toHaveBeenCalled();
  });

  it('centres the focused pin in the visible area at the zoom middle (Reduce Motion: at once)', async () => {
    // Window 390 x 844; the visible area is y 112 to 624, so its centre is (195, 368). Zoom: (0.6 + 2.4) / 2 = 1.5.
    jest.mocked(useReducedMotion).mockReturnValue(true);
    await mountMap([madinah, makkah, badr], { focusPlaceId: 'badr' });
    expect(screen.getByTestId('seerah-map-layer')).toHaveAnimatedStyle({
      transform: [{ translateX: 195 - 803 * 1.5 }, { translateY: 368 - 1122 * 1.5 }, { scale: 1.5 }],
    });
  });

  it('does not pan to a selected pin: only the focus does', async () => {
    await mountMap([madinah, makkah, badr], { selectedPlaceId: 'badr' });
    expect(screen.getByTestId('seerah-map-layer')).not.toHaveAnimatedStyle({
      transform: [{ translateX: 195 - 803 * 0.6 }, { translateY: 422 - 1122 * 0.6 }, { scale: 0.6 }],
    });
  });

  it('draws the routes, faint when dimmed, and the area labels', async () => {
    await mountMap([madinah, makkah], { dimmedRouteIds: ['r-hijra'] });
    expect(screen.getByTestId('seerah-map-route-r-hijra', hidden).props.opacity).toBe(0.22);
    expect(screen.getByText('الحجاز', hidden)).toBeOnTheScreen();
  });

  it('is not mirrored: the pin layer has the same transform in Arabic and English', async () => {
    const ar = await mountMap([madinah, makkah], {}, 'ar');
    const arStyle = JSON.stringify(screen.getByTestId('seerah-map-item-madinah').props.style);
    await ar.view.unmount();
    await mountMap([madinah, makkah], {}, 'en');
    expect(JSON.stringify(screen.getByTestId('seerah-map-item-madinah').props.style)).toBe(arStyle);
  });

  it('lays the map space and the edge-chip overlay out physically (LTR), so Egypt stays on the west side in Arabic', async () => {
    await mountMap([badr, makkah, madinah], {}, 'ar');
    expect(flatStyle(screen.getByTestId('seerah-map-space').props.style)).toMatchObject({ direction: 'ltr' });
    expect(flatStyle(screen.getByTestId('seerah-map-edges').props.style)).toMatchObject({ direction: 'ltr' });
    expect(flatStyle(screen.getByTestId('seerah-map-layer').props.style)).toMatchObject({ left: 0, position: 'absolute' });
  });

  describe('edge chips point where they say', () => {
    // Pin P at the middle of a 1644 x 2400 art, zoom 0.6: the window is centred on it. E sits beyond one window edge.
    const wide = { viewbox: [0, 0, 1644, 2400] as const };
    const groups = [
      { arabic: 'شمالًا', direction: 'north', english: 'north', x: 800, y: 163.3 },
      { arabic: 'جنوبًا', direction: 'south', english: 'south', x: 800, y: 2236.7 },
      { arabic: 'غربًا', direction: 'west', english: 'west', x: 141.7, y: 1200 },
      { arabic: 'شرقًا', direction: 'east', english: 'east', x: 1458.3, y: 1200 },
    ] as const;

    it.each(groups)('the $direction chip says «$arabic» in Arabic and «$english» in English, and draws the $direction arrow', async (group) => {
      for (const locale of locales) {
        const mounted = await mountMap(
          [makePin({ count: 1, name: 'مكة', placeId: 'p', x: 800, y: 1200 }), makePin({ count: 7, kind: 'region', name: 'الشام', opensLevel: null, placeId: 'sham', x: group.x, y: group.y })],
          wide,
          locale,
        );
        const word = locale === 'ar' ? `خارج الشاشة ${group.arabic}` : `off screen to the ${group.english}`;
        const chip = screen.getByRole('button', { name: new RegExp(`الشام.*${word}`) });
        expect(chip).toBeOnTheScreen();
        const arrow = screen.getByTestId(`seerah-map-edge-sham-arrow`, hidden);
        // A geographic arrow never mirrors, in either language.
        expect(flatStyle(arrow.props.style).transform).toBeUndefined();
        await mounted.view.unmount();
      }
    });
  });

  describe('a tap centres its item in the visible area and zooms (Reduce Motion: at once)', () => {
    const size = { height: 844, width: 390 };
    const content = { height: 2400, width: 1644 };
    const visible = { height: 844 - 112 - 220, width: 390, x: 0, y: 112 };
    const zoom = regionLevelFixture.zoom;
    const reduce = () => jest.mocked(useReducedMotion).mockReturnValue(true);

    it('a tap on an event pin lands on focusView at the zoom middle', async () => {
      reduce();
      await mountMap([madinah, makkah, badr]);
      await press(screen.getByTestId('seerah-map-pin-badr'));
      const expected = focusView({ x: 803, y: 1122 }, (zoom.default + zoom.max) / 2, visible, content, size, zoom);
      expect(screen.getByTestId('seerah-map-layer')).toHaveAnimatedStyle({
        transform: [{ translateX: expected.tx }, { translateY: expected.ty }, { scale: expected.scale }],
      });
    });

    it('a tap on a cluster centres the cluster between the header and the timeline, zoomed in', async () => {
      reduce();
      const a = makePin({ count: 2, name: 'أ', opensLevel: null, placeId: 'a', x: 878, y: 1000 });
      const b = makePin({ count: 3, name: 'ب', opensLevel: null, placeId: 'b', x: 918, y: 1000 });
      await mountMap([a, b]);
      await press(screen.getByRole('button', { name: '٢ مواضع متقاربة، ٥ أحداث. يكبّر الخريطة' }));
      const animated = (getAnimatedStyle as unknown as (component: unknown) => { transform: Record<string, number>[] })(
        screen.getByTestId('seerah-map-layer'),
      );
      const transform = animated.transform;
      const [tx, ty] = [transform[0]?.translateX ?? 0, transform[1]?.translateY ?? 0];
      expect(transform[2]?.scale).toBe((zoom.default + zoom.max) / 2);
      // The cluster's content point is at the visible centre: y 1000, x between the two pins.
      expect((368 - ty) / 1.5).toBeCloseTo(1000, 0);
      expect((195 - tx) / 1.5).toBeGreaterThanOrEqual(878);
      expect((195 - tx) / 1.5).toBeLessThanOrEqual(918);
    });

    it('a cluster tapped below the middle zoom spreads; tapped again from there it lists its places', async () => {
      reduce();
      const a = makePin({ count: 2, name: 'أ', opensLevel: null, placeId: 'a', x: 878, y: 1000 });
      const b = makePin({ count: 3, name: 'ب', opensLevel: null, placeId: 'b', x: 900, y: 1000 });
      const onClusterOpen = jest.fn();
      await mountMap([a, b], { onClusterOpen });
      const name = '٢ مواضع متقاربة، ٥ أحداث. يكبّر الخريطة';
      await press(screen.getByRole('button', { name }));
      expect(onClusterOpen).not.toHaveBeenCalled();
      await press(screen.getByRole('button', { name }));
      expect(onClusterOpen).toHaveBeenCalledWith(['b', 'a']);
    });

    it('a tap on an edge chip centres the region the same way', async () => {
      reduce();
      const sham = makePin({ count: 7, kind: 'region', name: 'الشام', opensLevel: null, placeId: 'sham', x: 878, y: 100 });
      await mountMap([madinah, makkah, sham]);
      await press(screen.getByRole('button', { name: 'الشام، ٧ أحداث، خارج الشاشة شمالًا' }));
      const expected = focusView({ x: 878, y: 100 }, (zoom.default + zoom.max) / 2, visible, content, size, zoom);
      expect(screen.getByTestId('seerah-map-layer')).toHaveAnimatedStyle({
        transform: [{ translateX: expected.tx }, { translateY: expected.ty }, { scale: expected.scale }],
      });
    });
  });

  describe('crisp overlay', () => {
    it('is skipped at or under 1×, where the art layer is already sharp', async () => {
      await mountMap([madinah, makkah]);
      await act(async () => {
        gestures().pan.onDeactivate({});
      });
      await act(async () => {
        for (let frame = 0; frame < 150; frame += 1) {
          advanceAnimationByTime();
        }
      });
      expect(screen.queryByTestId('seerah-map-crisp', hidden)).toBeNull();
    });

    it('is drawn at once when the map opens past 1× (a city level)', async () => {
      await mountMap([madinah, makkah], { zoom: { ...regionLevelFixture.zoom, default: 1.5 } });
      expect(screen.getByTestId('seerah-map-crisp', hidden)).toBeTruthy();
    });

    it('is shown with the visible rectangle once a pan settles, and hidden on the first frame of the next gesture', async () => {
      await mountMap([madinah, makkah], { zoom: { ...regionLevelFixture.zoom, default: 1.5 } });
      await act(async () => {
        gestures().pan.onActivate({});
      });
      // Hidden on the UI thread at once, while the overlay stays mounted (a settle redraws it in place).
      expect(screen.getByTestId('seerah-map-crisp-layer', hidden)).toHaveAnimatedStyle({ opacity: 0 });
      expect(screen.getByTestId('seerah-map-layer')).toHaveAnimatedStyle({ opacity: 1 });
      await act(async () => {
        gestures().pan.onDeactivate({});
      });
      await act(async () => {
        for (let frame = 0; frame < 150; frame += 1) {
          advanceAnimationByTime();
        }
      });
      const overlay = screen.getByTestId('seerah-map-crisp', hidden);
      // The native Svg gets the viewBox as its parts: origin, size, alignment (meet is 0).
      expect(overlay.props.vbWidth).toBeGreaterThan(0);
      expect(overlay.props.vbHeight).toBeGreaterThan(0);
      expect(overlay.props.align).toBe('xMinYMin');
      expect(overlay.props.meetOrSlice).toBe(0);
      expect(screen.getByTestId('seerah-map-crisp-layer', hidden)).toHaveAnimatedStyle({ opacity: 1 });
      // The zoomed route layer hides under the crisp routes.
      expect(screen.getByTestId('seerah-map-layer')).toHaveAnimatedStyle({ opacity: 0 });
      await act(async () => {
        gestures().pan.onActivate({});
      });
      expect(screen.getByTestId('seerah-map-crisp-layer', hidden)).toHaveAnimatedStyle({ opacity: 0 });
    });

    // Regression: the spring's end callback once captured its JS callback before it was defined, so the UI thread
    // scheduled `undefined` and the app aborted about one spring after any pin, cluster or edge-chip tap.
    const a = makePin({ count: 2, name: 'أ', opensLevel: null, placeId: 'a', x: 878, y: 1000 });
    const b = makePin({ count: 3, name: 'ب', opensLevel: null, placeId: 'b', x: 918, y: 1000 });
    const sham = makePin({ count: 7, kind: 'region', name: 'الشام', opensLevel: null, placeId: 'sham', x: 878, y: 100 });
    it.each([
      ['an event pin', [madinah, makkah, badr], () => screen.getByTestId('seerah-map-pin-badr')],
      ['a cluster', [a, b], () => screen.getByRole('button', { name: '٢ مواضع متقاربة، ٥ أحداث. يكبّر الخريطة' })],
      ['an edge chip', [madinah, makkah, sham], () => screen.getByTestId('seerah-map-edge-sham')],
    ] as const)('is drawn once the spring after a tap on %s settles (motion on)', async (_name, pins, target) => {
      jest.useFakeTimers();
      try {
        await mountMap([...pins]);
        await press(target());
        await act(async () => {
          jest.advanceTimersByTime(3000);
        });
        expect(screen.getByTestId('seerah-map-crisp', hidden)).toBeTruthy();
      } finally {
        jest.useRealTimers();
      }
    });
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/SeerahMap.tsx')).toEqual([]);
  });
});
