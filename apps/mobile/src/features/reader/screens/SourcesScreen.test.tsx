import { fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Dimensions, Linking } from 'react-native';

import { i18n } from '@/core/i18n';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { SourcesScreen } from './SourcesScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});

const SOURCE_KEYS = ['qf', 'tanzil', 'kfgqpc', 'mp3quran', 'way2quran', 'opendua', 'hadeethenc', 'adhan', 'fonts'] as const;

const OPENDUA_ATTRIBUTION =
  "OpenDua dataset v0.0.4 (https://opendua.org), by Ihsan Labs at the Human Development Fund. Based on Hisn al-Muslim by Sa'id ibn Ali ibn Wahf al-Qahtani. OpenDua editorial text and dataset structure are licensed CC BY 4.0. Recitation by Muhammad Jumah for OpenDua. OpenDua makes no ownership claim over the underlying religious texts.";

const SOURCE_PRESS_CASES = [
  { key: 'qf', url: 'https://quran.foundation' },
  { key: 'tanzil', url: 'https://tanzil.net' },
  { key: 'kfgqpc', url: 'https://qurancomplex.gov.sa' },
  { key: 'mp3quran', url: 'https://mp3quran.net' },
  { key: 'way2quran', url: 'https://way2quran.com' },
  { key: 'opendua', url: 'https://opendua.org/developers' },
  { key: 'hadeethenc', url: 'https://hadeethenc.com' },
  { key: 'adhan', url: 'https://github.com/batoulapps/adhan-js' },
  { key: 'fonts', url: 'https://openfontlicense.org' },
] as const;

describe('SourcesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Dimensions.set({
      screen: { fontScale: 1, height: 1334, scale: 1, width: 750 },
      window: { fontScale: 1, height: 1334, scale: 1, width: 750 },
    });
  });

  it.each(locales)('lists the QF font credit under the screen title in %s', async (locale) => {
    const view = await renderUi(<SourcesScreen testID="sources" />, { locale });
    expect(view.getByTestId('sources-qf-fonts')).toBeOnTheScreen();
    expect(view.getByTestId('sources-suncalc')).toBeOnTheScreen();
    expect(view.getByTestId('sources-header')).toBeOnTheScreen();
    expect(view.getByRole('header')).toBeOnTheScreen();
  });

  it.each(locales)('renders every source row and the QF font credit in %s', async (locale) => {
    const view = await renderUi(<SourcesScreen testID="sources" />, { locale });

    for (const key of SOURCE_KEYS) {
      expect(view.getByTestId(`sources-${key}`)).toBeOnTheScreen();
      expect(view.getByText(i18n.t(`reader.sources.${key}.title`, { lng: locale }))).toBeOnTheScreen();
      expect(view.getByText(i18n.t(`reader.sources.${key}.subtitle`, { lng: locale }))).toBeOnTheScreen();
    }
    expect(view.getByTestId('sources-group')).toBeOnTheScreen();
    expect(view.getByTestId('sources-qf-fonts')).toHaveTextContent(i18n.t('reader.sources.qfFonts', { lng: locale }));
  });

  it.each(locales)('shows the OpenDua attribution exactly, left to right, in %s', async (locale) => {
    const view = await renderUi(<SourcesScreen testID="sources" />, { locale });

    expect(view.getByText(OPENDUA_ATTRIBUTION)).toBeOnTheScreen();
    expect(flatStyle(view.getByText(OPENDUA_ATTRIBUTION).props.style)).toMatchObject({
      direction: 'ltr',
      textAlign: 'left',
      writingDirection: 'ltr',
    });
  });

  it.each(SOURCE_PRESS_CASES)('opens $url when the $key row is pressed', async ({ key, url }) => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const view = await renderUi(<SourcesScreen testID="sources" />);

    fireEvent.press(view.getByTestId(`sources-${key}`));

    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith(url);
  });

  it('exposes every source row as a button', async () => {
    const view = await renderUi(<SourcesScreen testID="sources" />);

    expect(view.getAllByRole('button').length).toBeGreaterThanOrEqual(SOURCE_KEYS.length);
    for (const key of SOURCE_KEYS) {
      expect(view.getByTestId(`sources-${key}`)).toHaveProp('accessibilityRole', 'button');
    }
  });

  it('renders the Arabic King Fahd title under RTL', async () => {
    const view = await renderUi(<SourcesScreen testID="sources" />, { locale: 'ar' });

    expect(view.getByText('مجمع الملك فهد لطباعة المصحف الشريف')).toBeOnTheScreen();
    expect(view.getByTestId('sources-kfgqpc')).toBeOnTheScreen();
  });

  it('renders the Arabic audio source credits under RTL', async () => {
    const view = await renderUi(<SourcesScreen testID="sources" />, { locale: 'ar' });

    expect(view.getByText('MP3Quran')).toBeOnTheScreen();
    expect(view.getByText('تلاوات القرّاء')).toBeOnTheScreen();
    expect(view.getByText('Way2Quran')).toBeOnTheScreen();
    expect(view.getByText('تلاوة الشيخ محمد عبادة والشيخ حسام الدين عبادي والشيخ أحمد بن طالب بن حميد. إنتاج مداد وطريق الإسلام')).toBeOnTheScreen();
  });

  it('has a back button that returns to Settings', async () => {
    const view = await renderUi(<SourcesScreen testID="sources" />);

    fireEvent.press(view.getByTestId('settings-back'));

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('caps the rows in a 720 pt column on a wide window, so they do not stretch to 1366 pt', async () => {
    Dimensions.set({
      screen: { fontScale: 1, height: 1024, scale: 1, width: 1366 },
      window: { fontScale: 1, height: 1024, scale: 1, width: 1366 },
    });
    const view = await renderUi(<SourcesScreen testID="sources" />);

    expect(flatStyle(view.getByTestId('sources-column').props.style)).toMatchObject({ alignSelf: 'center', maxWidth: 720 });
    expect(view.getByTestId('sources-qf-fonts')).toBeOnTheScreen();
    expect(view.getByTestId('sources-suncalc')).toBeOnTheScreen();
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/reader/screens/SourcesScreen.tsx')).toEqual([]);
  });
});
