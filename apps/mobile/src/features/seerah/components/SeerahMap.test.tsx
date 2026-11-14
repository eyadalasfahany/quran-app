import { act, fireEvent, screen } from '@testing-library/react-native';
import { usePanGesture, usePinchGesture } from 'react-native-gesture-handler';

import { locales } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderGesture } from '../../../../jest/seerah-ui';

import { makePin, regionLevelFixture } from '../fixtures';
import type { SeerahMapPin } from '../types';
import { SeerahMap, type SeerahMapProps } from './SeerahMap';

jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual<typeof import('react-native-gesture-handler')>('react-native-gesture-handler');
  return { ...actual, usePanGesture: jest.fn(actual.usePanGesture), usePinchGesture: jest.fn(actual.usePinchGesture) };
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
  return { ...callbacks, view };
}

function gestures() {
  const pan = jest.mocked(usePanGesture).mock.lastCall?.[0] as unknown as { onUpdate: (e: unknown) => void; onDeactivate: (e: unknown) => void };
  const pinch = jest.mocked(usePinchGesture).mock.lastCall?.[0] as unknown as { onUpdate: (e: unknown) => void; onDeactivate: (e: unknown) => void };
  return { pan, pinch };
}

beforeEach(() => {
  jest.mocked(usePanGesture).mockClear();
  jest.mocked(usePinchGesture).mockClear();
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
    const { onCityOpen, onPinPress } = await mountMap([madinah, makkah, badr]);
    await press(screen.getByTestId('seerah-map-pin-madinah'));
    expect(onCityOpen).toHaveBeenCalledWith('madinah', 'madinah');
    await press(screen.getByTestId('seerah-map-pin-badr'));
    expect(onPinPress).toHaveBeenCalledWith('badr', 0.6);
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

  it('hides the label that collides and keeps the one with the higher priority', async () => {
    // Not 44 pt apart in a line, so they stay separate pins, but the weak label runs into the strong one.
    const strong = makePin({ count: 2, labelPriority: 90, name: 'اسم طويل جدا للموضع القوي', opensLevel: null, placeId: 'strong', x: 878, y: 1000 });
    const weak = makePin({ count: 2, labelPriority: 10, name: 'اسم طويل جدا للموضع الضعيف', opensLevel: null, placeId: 'weak', x: 878 - 50 / 0.6, y: 1000 + 30 / 0.6 });
    await mountMap([strong, weak]);
    expect(screen.getByTestId('seerah-map-label-strong', hidden)).toBeOnTheScreen();
    expect(screen.queryByTestId('seerah-map-label-weak', hidden)).toBeNull();
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

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/SeerahMap.tsx')).toEqual([]);
  });
});
