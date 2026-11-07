import { fireEvent, type RenderResult } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Dimensions, Linking } from 'react-native';

import { i18n } from '@/core/i18n';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { testIdsInOrder } from '../../../../jest/hadith-ui-fixtures';

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

  describe('Hadith sources', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    const HADITH_KEYS = ['fawazahmed0', 'openiti', 'hadithapicom', 'meeatif', 'hadithjson'] as const;
    const URLS: Record<(typeof HADITH_KEYS)[number], string> = {
      fawazahmed0: 'https://github.com/fawazahmed0/hadith-api',
      openiti: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
      hadithapicom: 'https://hadithapi.com',
      meeatif: 'https://huggingface.co/datasets/meeAtif/hadith_datasets',
      hadithjson: 'https://github.com/AhmedBaset/hadith-json',
    };
    // The row's own test ID, found through the query (hidden elements included, as the rows are not accessible roots).
    const row = (view: Pick<RenderResult, 'queryAllByTestId'>, id: string): ReturnType<RenderResult['getByTestId']> => {
      const found = view.queryAllByTestId(id, { includeHiddenElements: true })[0];
      if (found === undefined) {
        throw new Error(`No row ${id}`);
      }
      return found;
    };
    // Group rows in tree order, leaving out the group itself and the row chevrons.
    const rowIds = (root: unknown) => testIdsInOrder(root, 'sources-group').filter((id) => /^sources-[a-z0-9]+$/.test(id) && id !== 'sources-group');
    const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    it('shows the fawazahmed0, OpenITI, hadithapi.com and dataset rows after the fonts row', async () => {
      const view = await renderUi(<SourcesScreen testID="sources" />);
      const ids = rowIds(view.toJSON());
      expect(ids.slice(-6)).toEqual(['sources-fonts', 'sources-fawazahmed0', 'sources-openiti', 'sources-hadithapicom', 'sources-meeatif', 'sources-hadithjson']);
    });

    it.each(['ar', 'en'] as const)('shows the meeAtif and hadith-json rows in %s', async (locale) => {
      const view = await renderUi(<SourcesScreen testID="sources" />, { locale });
      for (const key of ['meeatif', 'hadithjson'] as const) {
        expect(view.queryAllByText(new RegExp(escapeRegExp(i18n.t(`hadith.sources.${key}.title`, { lng: locale })))).length).toBeGreaterThan(0);
        expect(view.queryAllByText(new RegExp(escapeRegExp(i18n.t(`hadith.sources.${key}.subtitle`, { lng: locale })))).length).toBeGreaterThan(0);
      }
    });

    it.each(['ar', 'en'] as const)('shows the OpenITI credit in %s', async (locale) => {
      const view = await renderUi(<SourcesScreen testID="sources" />, { locale });
      expect(view.queryAllByText(new RegExp(escapeRegExp(i18n.t('hadith.sources.openiti.title', { lng: locale })))).length).toBeGreaterThan(0);
      expect(view.queryAllByText(new RegExp(escapeRegExp(i18n.t('hadith.sources.openiti.subtitle', { lng: locale })))).length).toBeGreaterThan(0);
    });

    it('keeps the existing rows and their order', async () => {
      const view = await renderUi(<SourcesScreen testID="sources" />);
      expect(rowIds(view.toJSON()).slice(0, 3)).toEqual(['sources-qf', 'sources-tanzil', 'sources-kfgqpc']);
    });
    // Covers the OpenITI row too: its URL is the licence deed.
    it('each new row opens its URL', async () => {
      const openURL = jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
      const view = await renderUi(<SourcesScreen testID="sources" />);
      for (const key of HADITH_KEYS) {
        fireEvent.press(row(view, `sources-${key}`));
        expect(openURL).toHaveBeenLastCalledWith(URLS[key]);
      }
      openURL.mockRestore();
    });

  });
});
