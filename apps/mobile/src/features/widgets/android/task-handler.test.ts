import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { fullSnapshot } from '../snapshot/test-fixtures';
import type { WidgetSnapshot } from '../snapshot/types';

import { handleWidgetTask, type WidgetTaskDeps } from './task-handler';
import { MISBAHA_TAP_ACTION, WIDGET_PROVIDERS } from './names';

const NOW = new Date(2026, 10, 2, 12, 0);

function props(overrides: Partial<WidgetTaskHandlerProps> & { widgetName?: string }): WidgetTaskHandlerProps {
  const { widgetName = WIDGET_PROVIDERS.misbaha, ...rest } = overrides;
  return {
    renderWidget: jest.fn(),
    widgetAction: 'WIDGET_UPDATE',
    widgetInfo: { height: 110, screenInfo: {} as never, width: 110, widgetId: 7, widgetName },
    ...rest,
  } as WidgetTaskHandlerProps;
}

function deps(initial: WidgetSnapshot | null = fullSnapshot()) {
  let stored = initial;
  let taps = 0;
  const recordMisbahaTap = jest.fn(() => {
    taps += 1;
    const count = (stored?.misbaha.count ?? 0) + 1;
    return { count, target: 100, todayTotal: (stored?.misbaha.todayTotal ?? 0) + 1 };
  });
  const value: WidgetTaskDeps = {
    now: () => NOW,
    readSnapshot: () => stored,
    recordMisbahaTap,
    refreshOthers: jest.fn(),
    scheme: 'taybah',
    writeSnapshot: (snapshot) => {
      stored = snapshot;
    },
  };
  return { value, recordMisbahaTap, taps: () => taps, current: () => stored };
}

describe('handleWidgetTask', () => {
  it('draws a widget on add and update from the stored snapshot, without counting', async () => {
    const d = deps();
    const p = props({ widgetAction: 'WIDGET_UPDATE' });
    await handleWidgetTask(p, d.value);
    expect(p.renderWidget).toHaveBeenCalledTimes(1);
    expect(d.recordMisbahaTap).not.toHaveBeenCalled();
  });

  it('counts a misbaha tap once per click event and redraws the tapped widget', async () => {
    const d = deps();
    const p = props({ clickAction: MISBAHA_TAP_ACTION, widgetAction: 'WIDGET_CLICK' });
    await handleWidgetTask(p, d.value);
    expect(d.recordMisbahaTap).toHaveBeenCalledTimes(1);
    expect(d.current()?.misbaha.count).toBe(34);
    expect(p.renderWidget).toHaveBeenCalledTimes(1);
  });

  it('keeps the stored snapshot agreeing with the counter after a tap', async () => {
    const d = deps();
    await handleWidgetTask(props({ clickAction: MISBAHA_TAP_ACTION, widgetAction: 'WIDGET_CLICK' }), d.value);
    expect(d.current()?.misbaha).toEqual({ count: 34, target: 100, todayTotal: 151 });
    expect(d.current()?.progress).toEqual(fullSnapshot().progress);
  });

  it('redraws the other providers after a tap', async () => {
    const d = deps();
    await handleWidgetTask(props({ clickAction: MISBAHA_TAP_ACTION, widgetAction: 'WIDGET_CLICK' }), d.value);
    expect(d.value.refreshOthers).toHaveBeenCalledWith(WIDGET_PROVIDERS.misbaha);
  });

  it('does nothing for an unknown click action', async () => {
    const d = deps();
    const p = props({ clickAction: 'taybah.unknown', widgetAction: 'WIDGET_CLICK' });
    await handleWidgetTask(p, d.value);
    expect(d.recordMisbahaTap).not.toHaveBeenCalled();
    expect(p.renderWidget).not.toHaveBeenCalled();
  });

  it('does not count the tap action sent by another provider', async () => {
    const d = deps();
    const p = props({ clickAction: MISBAHA_TAP_ACTION, widgetAction: 'WIDGET_CLICK', widgetName: WIDGET_PROVIDERS.progress });
    await handleWidgetTask(p, d.value);
    expect(d.recordMisbahaTap).not.toHaveBeenCalled();
  });

  it('ignores a provider name the app does not ship', async () => {
    const d = deps();
    const p = props({ widgetAction: 'WIDGET_UPDATE', widgetName: 'Unknown' });
    await handleWidgetTask(p, d.value);
    expect(p.renderWidget).not.toHaveBeenCalled();
  });

  it('draws the open-the-app state when no snapshot is stored, and still counts the tap', async () => {
    const d = deps(null);
    const p = props({ clickAction: MISBAHA_TAP_ACTION, widgetAction: 'WIDGET_CLICK' });
    await handleWidgetTask(p, d.value);
    expect(d.taps()).toBe(1);
    expect(d.current()).toBeNull();
    expect(p.renderWidget).toHaveBeenCalledTimes(1);
  });

  it('does nothing on delete', async () => {
    const d = deps();
    const p = props({ widgetAction: 'WIDGET_DELETED' });
    await handleWidgetTask(p, d.value);
    expect(p.renderWidget).not.toHaveBeenCalled();
    expect(d.recordMisbahaTap).not.toHaveBeenCalled();
  });
});
