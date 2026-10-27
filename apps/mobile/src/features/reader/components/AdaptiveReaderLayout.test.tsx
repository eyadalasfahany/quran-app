import { act, fireEvent } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { I18nManager } from 'react-native';

import { ThemeProvider } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { PANEL_INSET, panelStripWidth, SIDE_PANEL_WIDTH } from '../layout';
import { AdaptiveReaderLayout } from './AdaptiveReaderLayout';

const widths = [
  [375, 'sheet'],
  [700, 'sheet'],
  [900, 'overlay'],
  [1099, 'overlay'],
  [1100, 'docked'],
  [1366, 'docked'],
] as const;

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

    expect(style.width).toBe(SIDE_PANEL_WIDTH);
    expect(style[I18nManager.isRTL ? 'left' : 'right']).toBe(PANEL_INSET);
    const stage = flatStyle(view.getByTestId('reader-stage').props.style);
    expect(stage[I18nManager.isRTL ? 'marginLeft' : 'marginRight']).toBe(panelStripWidth());
    expect(view.getByTestId('reader-mini-player-slot').parent?.props.testID).toBe('reader-stage');
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

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/AdaptiveReaderLayout.tsx')).toEqual([]);
  });
});
