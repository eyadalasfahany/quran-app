import { act, fireEvent, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import { LANDSCAPE_PHONE, resetWindowSize, setWindowSize } from '../../../../jest/window-size';

import { i18n } from '@/core/i18n';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { requestLocationPermissions } from '../data/location';
import { usePrayerLocation } from '../hooks';
import { useQiblaHeading } from '../hooks/useQiblaHeading';
import { useScreenActive } from '../hooks/useScreenActive';
import { QiblaScreen } from './QiblaScreen';

// With history, back pops (router.back); with none, the screen falls back to the Salah tab (go-back.ts).
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn() } }));

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Success: 'success' },
  notificationAsync: jest.fn(() => Promise.resolve()),
}));

// The insets are read per render, so a test can give the screen a landscape notch (left or right).
let mockInsets = { bottom: 34, left: 0, right: 0, top: 59 };

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => mockInsets };
});

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

jest.mock('../data/location', () => ({
  requestLocationPermissions: jest.fn(() => Promise.resolve('granted')),
}));

// A fixed bearing and distance: the compass math itself is covered by the unit tests.
jest.mock('../data/prayer-times', () => ({ qiblaBearing: jest.fn(() => 244) }));
jest.mock('../data/distance', () => ({
  ...jest.requireActual<typeof import('../data/distance')>('../data/distance'),
  distanceToMakkah: jest.fn(() => 1245),
}));

const mockLocationWithCoords = {
  cityName: undefined,
  coords: { lat: 24.7136, lng: 46.6753 },
  pending: false,
  permissionStatus: Location.PermissionStatus.GRANTED,
  refresh: jest.fn(() => Promise.resolve()),
  source: 'auto' as const,
};

jest.mock('../hooks', () => ({ usePrayerLocation: jest.fn(() => mockLocationWithCoords) }));

jest.mock('../hooks/useQiblaHeading', () => ({
  ...jest.requireActual<typeof import('../hooks/useQiblaHeading')>('../hooks/useQiblaHeading'),
  useQiblaHeading: jest.fn(),
}));

// The screen is focused and foregrounded in these tests; the gating itself is covered in useScreenActive.test.
jest.mock('../hooks/useScreenActive', () => ({ useScreenActive: jest.fn(() => true) }));

type MockHeading = {
  /** The live heading in degrees, or null before the first sample. */
  heading: number | null;
  accuracy: 'good' | 'fair' | 'poor' | 'unavailable';
  supported: boolean;
  /** Whether the hook reports the needle as aligned (its hysteresis decides; the screen only shows it). */
  aligned?: boolean;
  /** Android has no declination yet (no location fix): the hook is waiting for the location. */
  awaitingLocation?: boolean;
};

/** What useQiblaHeading returns for a given sample: the heading as a SharedValue, as the hook exposes it. */
const mockHeading = ({ heading, accuracy, supported, aligned = false, awaitingLocation = false }: MockHeading) =>
  jest.mocked(useQiblaHeading).mockReturnValue({
    aligned,
    accuracy,
    awaitingLocation,
    hasHeading: heading !== null,
    headingValue: { value: heading ?? 0 } as never,
    supported,
  });

describe('QiblaScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(usePrayerLocation).mockReturnValue(mockLocationWithCoords);
    jest.mocked(useReducedMotion).mockReturnValue(false);
    mockHeading({ accuracy: 'good', heading: 14, supported: true });
  });

  it('renders header, dial, readout and meta panel on the player-dark canvas', async () => {
    const view = await renderUi(<QiblaScreen />);

    expect(view.getByText('اتجاه القبلة')).toBeOnTheScreen();
    expect(view.getByText('مكة المكرمة · المسجد الحرام')).toBeOnTheScreen();
    expect(view.getByLabelText('اتجاه القبلة: ٢٤٤ درجة')).toBeOnTheScreen();
    expect(view.getByText('٢٤٤°')).toBeOnTheScreen();
    expect(view.getByText('١٬٢٤٥ كم')).toBeOnTheScreen();
    expect(view.getByTestId('qibla-meta-panel')).toBeOnTheScreen();
  });

  it('goes back from the back button', async () => {
    const view = await renderUi(<QiblaScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'رجوع' }));

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('flips the back chevron only in RTL (%s)', async (locale) => {
    const view = await renderUi(<QiblaScreen />, { locale });
    const icon = view.getByTestId('qibla-back-icon', { includeHiddenElements: true });

    expect(flatStyle(icon.props.style).transform).toEqual(locale === 'ar' ? [{ scaleX: -1 }] : undefined);
  });

  it('asks for permission and refreshes the location from the location button', async () => {
    const view = await renderUi(<QiblaScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'الموقع' }));

    expect(requestLocationPermissions).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mockLocationWithCoords.refresh).toHaveBeenCalledTimes(1));
  });

  it('shows the empty state when the location is unset, and its action asks for permission', async () => {
    const refresh = jest.fn(() => Promise.resolve());
    jest.mocked(usePrayerLocation).mockReturnValue({ ...mockLocationWithCoords, coords: null, refresh });

    const view = await renderUi(<QiblaScreen />);

    expect(view.getByRole('header', { name: 'الموقع غير محدد' })).toBeOnTheScreen();
    expect(view.queryByTestId('qibla-compass')).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'تحديد الموقع' }));
    expect(requestLocationPermissions).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('shows the calibration notice while accuracy is poor, and hides it on recovery', async () => {
    mockHeading({ accuracy: 'poor', heading: 14, supported: true });
    const view = await renderUi(<QiblaScreen />);

    expect(view.getByText('حرّك جهازك على شكل ٨')).toBeOnTheScreen();

    mockHeading({ accuracy: 'good', heading: 14, supported: true });
    await view.rerender(<QiblaScreen />);
    await waitFor(() => expect(view.queryByText('حرّك جهازك على شكل ٨')).toBeNull());
  });

  it('shows the unsupported note and a static dial when the device has no compass', async () => {
    mockHeading({ accuracy: 'unavailable', heading: null, supported: false });
    const view = await renderUi(<QiblaScreen />);

    expect(view.getByText('هذا الجهاز لا يدعم البوصلة؛ الاتجاه المعروض محسوب من موقعك')).toBeOnTheScreen();
    // Static dial: the needle rests on the marker at the bearing.
    const style = view.getByTestId('qibla-compass-needle').props.style;
    expect(JSON.stringify(style)).toContain('244deg');
  });

  it('shows the aligned pill and fires the success haptic when the needle settles on the marker', async () => {
    mockHeading({ accuracy: 'good', aligned: true, heading: 242, supported: true }); // |244 − 242| ≤ 3, decided by the hook
    const view = await renderUi(<QiblaScreen />);

    expect(view.getByText('أنت باتجاه القبلة')).toBeOnTheScreen();
    await waitFor(() =>
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success),
    );
    // The haptic effect is keyed on the aligned edge ([aligned] deps + a ref), so it fires
    // once per false→true transition. RNTL remounts on rerender, so an exact count across
    // renders is not assertable here; the negative cases below guard the edges.
  });

  it('shows neither the pill nor a haptic while unaligned', async () => {
    mockHeading({ accuracy: 'good', heading: 100, supported: true });
    const view = await renderUi(<QiblaScreen />);

    expect(view.queryByText('أنت باتجاه القبلة')).toBeNull();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('does not watch the compass while the screen is not focused or the app is backgrounded', async () => {
    jest.mocked(useScreenActive).mockReturnValueOnce(false);

    await renderUi(<QiblaScreen />);

    expect(useQiblaHeading).toHaveBeenCalledWith(false, 244);
  });

  it('a failed haptic is caught and the screen keeps working', async () => {
    jest.mocked(Haptics.notificationAsync).mockRejectedValueOnce(new Error('haptics unavailable'));
    mockHeading({ accuracy: 'good', aligned: true, heading: 242, supported: true });

    const view = await renderUi(<QiblaScreen />);

    expect(view.getByText('أنت باتجاه القبلة')).toBeOnTheScreen();
    await waitFor(() => expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1));
  });

  it('renders the static dial and no haptic under Reduce Motion, even when aligned', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    mockHeading({ accuracy: 'good', aligned: true, heading: 244, supported: true });
    const view = await renderUi(<QiblaScreen />);

    // The hook is not even asked to watch: enabled = bearing !== null && !reduceMotion && the screen is active.
    expect(useQiblaHeading).toHaveBeenCalledWith(false, 244);
    expect(view.queryByText('أنت باتجاه القبلة')).toBeNull();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(JSON.stringify(view.getByTestId('qibla-compass-needle').props.style)).toContain('244deg');
  });

  it('says the dial is north-up while there is no live heading (no sample yet)', async () => {
    mockHeading({ accuracy: 'unavailable', heading: null, supported: true });
    const view = await renderUi(<QiblaScreen />);

    expect(view.getByText('القرص ثابت على الشمال الحقيقي؛ يدور مع الجهاز عند توفّر البوصلة')).toBeOnTheScreen();
    expect(view.getByTestId('qibla-north-up')).toBeOnTheScreen();
  });

  it('shows the calibration notice, not the north-up note, for poor readings before any good heading', async () => {
    mockHeading({ accuracy: 'poor', heading: null, supported: true });
    const view = await renderUi(<QiblaScreen />);

    expect(view.getByText('حرّك جهازك على شكل ٨')).toBeOnTheScreen();
    expect(view.queryByTestId('qibla-north-up')).toBeNull();
  });

  it('waits for the location, not a calibration notice, while the declination is missing', async () => {
    mockHeading({ accuracy: 'unavailable', awaitingLocation: true, heading: null, supported: true });
    const view = await renderUi(<QiblaScreen />);

    expect(view.getByTestId('qibla-waiting-location')).toHaveTextContent('بانتظار تحديد الموقع');
    expect(view.getByTestId('qibla-north-up')).toBeOnTheScreen();
    expect(view.queryByText('حرّك جهازك على شكل ٨')).toBeNull();
    expect(view.getByLabelText('غير متاحة')).toBeOnTheScreen();
  });

  it('shows the waiting line in English', async () => {
    mockHeading({ accuracy: 'unavailable', awaitingLocation: true, heading: null, supported: true });
    const view = await renderUi(<QiblaScreen />, { locale: 'en' });

    expect(view.getByText('Waiting for your location')).toBeOnTheScreen();
    expect(view.getByTestId('qibla-north-up')).toBeOnTheScreen();
  });

  it('drops the waiting line once the location arrives and the heading is live', async () => {
    mockHeading({ accuracy: 'unavailable', awaitingLocation: true, heading: null, supported: true });
    const view = await renderUi(<QiblaScreen />);
    expect(view.getByTestId('qibla-waiting-location')).toBeOnTheScreen();

    mockHeading({ accuracy: 'good', heading: 14, supported: true });
    await view.rerender(<QiblaScreen />);

    expect(view.queryByTestId('qibla-waiting-location')).toBeNull();
    expect(view.queryByTestId('qibla-north-up')).toBeNull();
  });

  it('shows the calibration notice for fair readings, and the dial is live', async () => {
    mockHeading({ accuracy: 'fair', heading: 14, supported: true });
    const view = await renderUi(<QiblaScreen />);

    expect(view.getByText('حرّك جهازك على شكل ٨')).toBeOnTheScreen();
    expect(view.queryByTestId('qibla-north-up')).toBeNull();
    expect(view.queryByTestId('qibla-aligned')).toBeNull();
  });

  it('says the dial is north-up under Reduce Motion, even with a live heading, and says why', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const view = await renderUi(<QiblaScreen />);

    expect(view.getByTestId('qibla-north-up')).toBeOnTheScreen();
    expect(view.getByText('القرص ثابت على الشمال الحقيقي لأن تقليل الحركة مفعّل')).toBeOnTheScreen();
    expect(view.queryByText('القرص ثابت على الشمال الحقيقي؛ يدور مع الجهاز عند توفّر البوصلة')).toBeNull();
  });

  it.each(locales)('states the Reduce Motion north-up note in %s', async (locale) => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const view = await renderUi(<QiblaScreen />, { locale });

    expect(view.getByText(i18n.t('home.salah.qiblaScreen.northUpReduceMotion', { lng: locale }))).toBeOnTheScreen();
  });

  it('states the no-sample north-up note, not the Reduce Motion one, when the compass is simply not ready', async () => {
    mockHeading({ accuracy: 'unavailable', heading: null, supported: true });
    const view = await renderUi(<QiblaScreen />);

    expect(view.getByText(i18n.t('home.salah.qiblaScreen.northUpNote', { lng: 'ar' }))).toBeOnTheScreen();
  });

  it('drops the north-up note once the dial is live', async () => {
    const view = await renderUi(<QiblaScreen />);

    expect(view.queryByTestId('qibla-north-up')).toBeNull();
  });

  it.each(locales)('states the north-up note in %s', async (locale) => {
    mockHeading({ accuracy: 'unavailable', heading: null, supported: true });
    const view = await renderUi(<QiblaScreen />, { locale });

    expect(view.getByText(i18n.t('home.salah.qiblaScreen.northUpNote', { lng: locale }))).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/screens/QiblaScreen.tsx')).toEqual([]);
  });
});

describe('QiblaScreen layout (ADR 0036)', () => {
  afterEach(() => {
    mockInsets = { bottom: 34, left: 0, right: 0, top: 59 };
    resetWindowSize();
  });

  // The layout event lands in a state update, so it is awaited inside act (the dial sizes from it).
  async function layout(element: { props: object }, width: number, height: number): Promise<void> {
    await act(async () => {
      fireEvent(element as Parameters<typeof fireEvent>[0], 'layout', {
        nativeEvent: { layout: { height, width, x: 0, y: 0 } },
      });
    });
  }

  it('stacks the dial above its labels in a tall window', async () => {
    const view = await renderUi(<QiblaScreen />);

    expect(view.getByTestId('qibla-stage')).toBeOnTheScreen();
    expect(view.queryByTestId('qibla-row')).toBeNull();
  });

  it('sets the dial beside its labels and meta panel in a short window', async () => {
    setWindowSize(LANDSCAPE_PHONE.width, LANDSCAPE_PHONE.height);
    const view = await renderUi(<QiblaScreen />);

    expect(view.getByTestId('qibla-row')).toBeOnTheScreen();
    expect(view.getByTestId('qibla-dial-column')).toBeOnTheScreen();
    expect(view.getByTestId('qibla-meta-panel')).toBeOnTheScreen();
    expect(view.queryByTestId('qibla-stage')).toBeNull();
  });

  it('draws the dial at the space it is given, under its 336 frame size', async () => {
    const view = await renderUi(<QiblaScreen />);

    await layout(view.getByTestId('qibla-stage'), 390, 300);

    // The stage is 300 high with no labels measured yet, so the dial gets 300 less the 16 gap.
    expect(flatStyle(view.getByTestId('qibla-dial').props.style).width).toBe(284);
    expect(flatStyle(view.getByTestId('qibla-compass').props.style).width).toBe(284);
  });

  it('never draws the dial above 336, even in a tall stage', async () => {
    const view = await renderUi(<QiblaScreen />);

    await layout(view.getByTestId('qibla-stage'), 390, 1200);

    expect(flatStyle(view.getByTestId('qibla-dial').props.style).width).toBe(336);
  });

  it('keeps the dial at least 160 even when the stage is very small', async () => {
    const view = await renderUi(<QiblaScreen />);

    await layout(view.getByTestId('qibla-stage'), 390, 100);

    expect(flatStyle(view.getByTestId('qibla-dial').props.style).width).toBe(160);
  });

  it('scales the ambient glow with the dial', async () => {
    const view = await renderUi(<QiblaScreen />);

    await layout(view.getByTestId('qibla-stage'), 390, 300);

    // 284 × 480 / 336, rounded.
    expect(flatStyle(view.getByTestId('qibla-glow').props.style).width).toBe(406);
  });

  it('fits the dial to the short window\'s dial column', async () => {
    setWindowSize(LANDSCAPE_PHONE.width, LANDSCAPE_PHONE.height);
    const view = await renderUi(<QiblaScreen />);

    await layout(view.getByTestId('qibla-dial-column'), 400, 300);

    expect(flatStyle(view.getByTestId('qibla-dial').props.style).width).toBe(300);
  });

  it.each([
    // Arabic: the notch on the right is the start edge, so it moves the start padding.
    ['ar', 12, 44],
    ['en', 44, 12],
  ] as const)('pads the header by the reading-direction insets in %s', async (locale, start, end) => {
    mockInsets = { bottom: 34, left: 44, right: 12, top: 59 };
    const view = await renderUi(<QiblaScreen />, { locale });

    const style = flatStyle(view.getByTestId('qibla-header').props.style);
    expect(style.paddingStart).toBe(start + 20);
    expect(style.paddingEnd).toBe(end + 20);
    expect(style.paddingTop).toBe(59);
  });
});
