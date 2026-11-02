import { act, fireEvent } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Dimensions, Text } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { ThemeProvider, themes } from '@/core/theme';
import { MINI_PLAYER_METRICS, MINI_PLAYER_READER_BOTTOM } from '@/features/audio/mini-player-metrics';
import { usePlayerStore } from '@/features/audio/playerStore';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { PANEL_INSET, panelStripWidth, SIDE_PANEL_WIDTH } from '../layout';
import { useReaderMiniCollapse } from '../mini-bar-collapse';
import { AdaptiveReaderLayout } from './AdaptiveReaderLayout';
import { READER_TOOLBAR_CLEARANCE } from './ReaderToolbar';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const widths = [
  [375, 'sheet'],
  [700, 'sheet'],
  [900, 'overlay'],
  [1099, 'overlay'],
  [1100, 'docked'],
  [1366, 'docked'],
] as const;

function setWindowWidth(width: number) {
  Dimensions.set({
    screen: { fontScale: 1, height: 844, scale: 1, width },
    window: { fontScale: 1, height: 844, scale: 1, width },
  });
}

// Loads a surah and starts it, so the mini player bar shows.
function startPlayback() {
  const store = usePlayerStore.getState();
  store.beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 });
  store.markPlaying();
}

// The bar's top edge measured up from the content area's bottom: 28 above the safe area plus its 68 height.
const barTop = MINI_PLAYER_READER_BOTTOM + MINI_PLAYER_METRICS.reader.height;

beforeEach(() => {
  setWindowWidth(390);
  usePlayerStore.getState().reset();
  jest.mocked(useReducedMotion).mockReturnValue(false);
});

function themed(node: ReactElement) {
  return <ThemeProvider name="light">{node}</ThemeProvider>;
}

function layout(width: number, extra: Partial<Parameters<typeof AdaptiveReaderLayout>[0]> = {}) {
  return (
    <AdaptiveReaderLayout
      onCloseOverlay={() => undefined}
      onMoveToPanel={() => undefined}
      onMoveToSheet={() => undefined}
      panelOpen
      verseKey="2:255"
      width={width}
      {...extra}
    >
      <></>
    </AdaptiveReaderLayout>
  );
}

describe('AdaptiveReaderLayout', () => {
  it.each(widths)('uses %s pt as %s', async (width, placement) => {
    const view = await renderUi(layout(width));
    expect(view.getByTestId(`reader-layout-${placement}`)).toBeOnTheScreen();
  });

  it.each(locales)('places the panel on the trailing edge in %s', async (locale) => {
    const view = await renderUi(layout(1366), { locale });
    const host = view.getByTestId('reader-panel-host');
    const style = flatStyle(host.props.style);

    // Logical insets: React Native maps `end` to the trailing edge in both directions.
    expect(style.width).toBe(SIDE_PANEL_WIDTH);
    expect(style.end).toBe(PANEL_INSET);
    expect(style.left).toBeUndefined();
    expect(style.right).toBeUndefined();
    const stage = flatStyle(view.getByTestId('reader-stage').props.style);
    expect(stage.marginEnd).toBe(panelStripWidth());
    expect(stage.marginLeft).toBeUndefined();
    expect(stage.marginRight).toBeUndefined();
    expect(view.getByTestId('reader-mini-player-slot').parent?.props.testID).toBe('reader-stage');
  });

  it('reserves no strip on a docked window while the panel is closed', async () => {
    const view = await renderUi(layout(1366, { panelOpen: false }));

    expect(view.queryByTestId('reader-panel-host')).toBeNull();
    expect(flatStyle(view.getByTestId('reader-stage').props.style).marginEnd).toBe(0);
  });

  it('closes an overlay from a tap outside and leaves a docked panel open', async () => {
    const onCloseOverlay = jest.fn();
    const overlay = await renderUi(layout(900, { onCloseOverlay }));
    await fireEvent.press(overlay.getByTestId('reader-overlay-scrim', { includeHiddenElements: true }));
    expect(onCloseOverlay).toHaveBeenCalledTimes(1);

    const docked = await renderUi(layout(1366, { onCloseOverlay }));
    expect(docked.queryByTestId('reader-overlay-scrim')).toBeNull();
  });

  it('moves a selection between the sheet and the panel when the window crosses 1,100', async () => {
    const onMoveToSheet = jest.fn();
    const onMoveToPanel = jest.fn();
    const view = await renderUi(layout(1366, { onMoveToPanel, onMoveToSheet, verseKey: '2:255' }));

    await act(async () => {
      view.rerender(themed(layout(700, { onMoveToPanel, onMoveToSheet, verseKey: '2:255' })));
    });
    expect(onMoveToSheet).toHaveBeenCalledWith('2:255');

    await act(async () => {
      view.rerender(themed(layout(1366, { onMoveToPanel, onMoveToSheet, verseKey: '2:255' })));
    });
    expect(onMoveToPanel).toHaveBeenCalledWith('2:255');
  });

  it('draws the panel at the side-panel width token', async () => {
    const view = await renderUi(layout(1366));

    expect(flatStyle(view.getByTestId('reader-panel-host').props.style).width).toBe(themes.light.size.sidePanel);
  });

  it.each(locales)('floats the resume slot centred at the bottom of the stage in %s', async (locale) => {
    const view = await renderUi(layout(375, { resume: <Text>resume</Text> }), { locale });
    const slot = view.getByTestId('reader-resume-slot');

    expect(flatStyle(slot.props.style)).toMatchObject({
      alignItems: 'center',
      bottom: themes.light.space[4],
      left: 0,
      position: 'absolute',
      right: 0,
    });
    expect(slot.props.pointerEvents).toBe('box-none');
    expect(view.getByText('resume')).toBeOnTheScreen();
  });

  it('lifts the resume pill 8 above the mini bar while the bar shows (28 + 68 + 8)', async () => {
    startPlayback();
    const view = await renderUi(layout(375, { miniPlayer: <Text>mini</Text>, resume: <Text>resume</Text> }));

    expect(barTop + themes.light.space[2]).toBe(104);
    expect(flatStyle(view.getByTestId('reader-resume-slot').props.style).bottom).toBe(104);
  });

  it('keeps the resume pill at space[4] when the mini bar is not showing', async () => {
    const view = await renderUi(layout(375, { miniPlayer: <Text>mini</Text>, resume: <Text>resume</Text> }));

    expect(flatStyle(view.getByTestId('reader-resume-slot').props.style).bottom).toBe(themes.light.space[4]);
  });

  it('keeps the resume pill at space[4] on an expanded window, where the bar is hidden', async () => {
    setWindowWidth(1000);
    startPlayback();
    // The panel is closed: an open overlay panel is a modal, which hides the rest of the tree from the queries.
    const view = await renderUi(
      layout(1000, { miniPlayer: <Text>mini</Text>, panelOpen: false, resume: <Text>resume</Text> }),
    );

    expect(flatStyle(view.getByTestId('reader-resume-slot').props.style).bottom).toBe(themes.light.space[4]);
  });

  it('keeps the resume pill at space[4] when the bar is not passed, even while playing', async () => {
    startPlayback();
    const view = await renderUi(layout(375, { resume: <Text>resume</Text> }));

    expect(flatStyle(view.getByTestId('reader-resume-slot').props.style).bottom).toBe(themes.light.space[4]);
  });

  it.each(locales)('draws the mini player 28 above the bottom safe area, 16 in from each side (%s)', async (locale) => {
    startPlayback();
    const view = await renderUi(layout(375, { bottomInset: 34, miniPlayer: <Text>mini</Text> }), { locale });
    const dock = view.getByTestId('reader-mini-player-dock');

    expect(view.getByText('mini')).toBeOnTheScreen();
    expect(dock.parent?.props.testID).toBe('reader-mini-player-slot');
    expect(flatStyle(dock.props.style)).toMatchObject({
      bottom: 34 + MINI_PLAYER_READER_BOTTOM,
      end: 16,
      position: 'absolute',
      start: 16,
    });
    expect(dock.props.pointerEvents).toBe('box-none');
  });

  it('drops the dock to the capsule (18 above the safe area) and lifts the resume pill over it (18 + 44 + 8) while collapsed', async () => {
    startPlayback();
    useReaderMiniCollapse.getState().setCollapsed(true);
    try {
      const view = await renderUi(layout(375, { bottomInset: 34, miniPlayer: <Text>mini</Text>, resume: <Text>resume</Text> }));

      expect(flatStyle(view.getByTestId('reader-mini-player-dock').props.style).bottom).toBe(34 + 18);
      expect(flatStyle(view.getByTestId('reader-resume-slot').props.style).bottom).toBe(18 + 44 + themes.light.space[2]);
    } finally {
      useReaderMiniCollapse.getState().setCollapsed(false);
    }
  });

  it('draws no mini player dock when none is given', async () => {
    const view = await renderUi(layout(375));

    expect(view.queryByTestId('reader-mini-player-dock')).toBeNull();
    expect(view.getByTestId('reader-mini-player-slot')).toBeOnTheScreen();
  });

  it('leaves out the resume slot when there is nothing to resume', async () => {
    const view = await renderUi(layout(375));

    expect(view.queryByTestId('reader-resume-slot')).toBeNull();
  });

  describe('overlay scrim and panel (iPad portrait)', () => {
    const HIDDEN = { includeHiddenElements: true } as const;
    it.each([900, 1099])('dims the page and lifts the panel below the toolbar at %s pt', async (width) => {
      const view = await renderUi(layout(width, { topInset: 20 }));

      const fill = flatStyle(view.getByTestId('reader-overlay-scrim-fill', HIDDEN).props.style);
      expect(fill.backgroundColor).toBe(themes.light.colors.scrim);
      expect(fill.position).toBe('absolute');

      const host = flatStyle(view.getByTestId('reader-panel-host', HIDDEN).props.style);
      expect(host.top).toBe(20 + READER_TOOLBAR_CLEARANCE + PANEL_INSET);
      expect(host.top).toBe(100);
      expect(host.backgroundColor).toBe(themes.light.colors.surfaceRaised);
      expect(host.borderRadius).toBe(themes.light.radius.xl);
      expect(host.boxShadow).toBe(themes.light.shadows.glass);
    });

    it.each([1100, 1366])('leaves a docked panel without a scrim, a solid background or the toolbar offset at %s pt', async (width) => {
      const view = await renderUi(layout(width, { topInset: 20 }));

      expect(view.queryByTestId('reader-overlay-scrim')).toBeNull();
      const host = flatStyle(view.getByTestId('reader-panel-host', HIDDEN).props.style);
      expect(host.top).toBe(20 + PANEL_INSET);
      expect(host.backgroundColor).toBeUndefined();
    });

    it.each([375, 700])('draws no panel and no scrim in the sheet placement at %s pt', async (width) => {
      const view = await renderUi(layout(width));

      expect(view.queryByTestId('reader-panel-host')).toBeNull();
      expect(view.queryByTestId('reader-overlay-scrim')).toBeNull();
    });

    it('draws no scrim on an overlay window while the panel is closed', async () => {
      const view = await renderUi(layout(900, { panelOpen: false }));

      expect(view.queryByTestId('reader-overlay-scrim')).toBeNull();
    });

    it('calls onCloseOverlay when the scrim is pressed', async () => {
      const onCloseOverlay = jest.fn();
      const view = await renderUi(layout(900, { onCloseOverlay }));

      await fireEvent.press(view.getByTestId('reader-overlay-scrim-fill', { includeHiddenElements: true }));
      expect(onCloseOverlay).toHaveBeenCalledTimes(1);
    });

    it('labels the scrim as the panel dismiss control', async () => {
      const view = await renderUi(layout(900));

      expect(view.getByTestId('reader-overlay-scrim', HIDDEN).props.accessibilityLabel).toEqual(expect.any(String));
      expect(view.getByTestId('reader-overlay-scrim', HIDDEN).props.accessibilityLabel).not.toBe('');
    });

    it.each(locales)('draws the dimmed overlay and the lifted panel in %s', async (locale) => {
      const view = await renderUi(layout(900, { topInset: 20 }), { locale });

      expect(view.getByTestId('reader-overlay-scrim-fill', HIDDEN)).toBeOnTheScreen();
      expect(flatStyle(view.getByTestId('reader-panel-host', HIDDEN).props.style).top).toBe(100);
    });

    it('draws the scrim at full strength under Reduce Motion, with no fade', async () => {
      jest.mocked(useReducedMotion).mockReturnValue(true);
      const view = await renderUi(layout(900));

      expect(flatStyle(view.getByTestId('reader-overlay-scrim-fill', HIDDEN).props.style).opacity).toBe(1);
    });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/AdaptiveReaderLayout.tsx')).toEqual([]);
  });
});
