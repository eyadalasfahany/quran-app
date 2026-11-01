import { Dimensions, Platform, Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { featureComponentLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';
import { MINI_PLAYER_TABS_FOOTPRINT } from '@/features/audio/mini-player-metrics';
import { usePlayerStore } from '@/features/audio/playerStore';

import { SectionScreen } from './SectionScreen';

function setWindowWidth(width: number) {
  Dimensions.set({
    screen: { fontScale: 1, height: 844, scale: 1, width },
    window: { fontScale: 1, height: 844, scale: 1, width },
  });
}

function startPlayback() {
  const store = usePlayerStore.getState();
  store.beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 });
  store.markPlaying();
}

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 47 }),
  };
});

describe('SectionScreen', () => {
  it('renders the title as a header on the surface, below the top inset', async () => {
    const view = await renderUi(<SectionScreen testID="screen" title="الاستماع" />);

    expect(view.getByRole('header', { name: 'الاستماع' })).toBeOnTheScreen();
    expect(flatStyle(view.getByText('الاستماع').props.style)).toMatchObject({
      color: themes.light.colors.ink,
      fontFamily: 'Amiri-Bold',
      fontSize: 28,
      lineHeight: 36,
    });
    expect(flatStyle(view.getByTestId('screen').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surface,
      flex: 1,
      paddingTop: 47,
    });
  });

  it('renders its content under the title', async () => {
    const view = await renderUi(
      <SectionScreen testID="screen" title="الرئيسية">
        <Text>محتوى</Text>
      </SectionScreen>,
    );

    expect(view.getByText('محتوى')).toBeOnTheScreen();
  });

  it('renders the trailing control beside the title', async () => {
    const view = await renderUi(<SectionScreen testID="screen" title="الرئيسية" trailing={<Text>بحث</Text>} />);

    expect(view.getByText('بحث')).toBeOnTheScreen();
  });

  it.each(['light', 'sepia', 'dark'] as const)('draws the title in ink in %s', async (theme) => {
    const view = await renderUi(<SectionScreen testID="screen" title="title" />, { theme });

    expect(flatStyle(view.getByText('title').props.style).color).toBe(themes[theme].colors.ink);
  });

  it.each(locales)('renders in %s', async (locale) => {
    const view = await renderUi(<SectionScreen testID="screen" title={locale} />, { locale });

    expect(view.getByRole('header', { name: locale })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('core/layout/SectionScreen.tsx')).toEqual([]);
  });

  describe('above the tabs mini bar', () => {
    beforeEach(() => {
      setWindowWidth(390);
      usePlayerStore.getState().reset();
    });

    it('is the bar height plus its gap, 76', () => {
      expect(MINI_PLAYER_TABS_FOOTPRINT).toBe(76);
    });

    it.each(locales)('adds the bar footprint to the bottom of the content while the bar shows (%s)', async (locale) => {
      startPlayback();
      const view = await renderUi(<SectionScreen testID="screen" title="x" />, { locale });

      expect(flatStyle(view.getByTestId('screen-content').props.style).paddingBottom).toBe(76);
    });

    it('adds no bottom padding while the player is idle', async () => {
      const view = await renderUi(<SectionScreen testID="screen" title="x" />);

      expect(flatStyle(view.getByTestId('screen-content').props.style).paddingBottom).toBe(0);
    });

    it('adds no bottom padding on an expanded window, where the bar is hidden', async () => {
      setWindowWidth(1000);
      startPlayback();
      const view = await renderUi(<SectionScreen testID="screen" title="x" />);

      expect(flatStyle(view.getByTestId('screen-content').props.style).paddingBottom).toBe(0);
    });
  });

  describe('on Android, above the floating tab bar (ADR 0033)', () => {
    const originalOs = Platform.OS;

    beforeEach(() => {
      setWindowWidth(390);
      usePlayerStore.getState().reset();
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
    });

    afterEach(() => {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOs });
    });

    it('clears the floating bar: 12 + 64 with the bottom inset of 0', async () => {
      const view = await renderUi(<SectionScreen testID="screen" title="x" />);

      expect(flatStyle(view.getByTestId('screen-content').props.style).paddingBottom).toBe(76);
    });

    it('clears the floating bar and the mini bar above it while something plays', async () => {
      startPlayback();
      const view = await renderUi(<SectionScreen testID="screen" title="x" />);

      expect(flatStyle(view.getByTestId('screen-content').props.style).paddingBottom).toBe(76 + 76);
    });
  });
});
