import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';
import { useAzkarReminder } from '@/features/azkar/reminders/hooks';
import type { AzkarReminder } from '@/features/azkar/reminders/reminders-repository';

import { MyDuaReaderActions } from './MyDuaReaderActions';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));

jest.mock('@/features/azkar/reminders/hooks', () => ({
  useAzkarReminder: jest.fn(() => null),
}));

const REMINDER: AzkarReminder = {
  id: 'r-1',
  targetType: 'my_dua',
  targetKey: 'dua-1',
  enabled: true,
  triggerType: 'clock',
  clockTime: '07:05',
  prayer: null,
  offsetMinutes: null,
  notificationIds: [],
  updatedAt: 1,
};

/** The glyph colour drawn inside a button: the first tint found walking down its children. */
type Node = { props?: { tintColor?: string }; children?: (Node | string)[] };
function tintOf(node: Node): string | undefined {
  if (node.props?.tintColor !== undefined) {
    return node.props.tintColor;
  }
  for (const child of node.children ?? []) {
    if (typeof child !== 'string') {
      const found = tintOf(child);
      if (found !== undefined) {
        return found;
      }
    }
  }
  return undefined;
}

function renderActions(textSizeOpen = false) {
  const handlers = { onShare: jest.fn(), onTextSize: jest.fn() };
  return { handlers, ui: <MyDuaReaderActions duaId="dua-1" textSizeOpen={textSizeOpen} {...handlers} /> };
}

describe('MyDuaReaderActions', () => {
  beforeEach(() => {
    jest.mocked(useAzkarReminder).mockReturnValue(null);
    jest.mocked(router.push).mockClear();
  });

  it('draws the bell, share and text size controls with their labels', async () => {
    const { ui } = renderActions();
    await renderUi(ui);
    expect(screen.getByRole('button', { name: 'تذكير' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'مشاركة' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'حجم النص' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'إضافة إلى المفضلة' })).toBeNull();
  });

  it('draws the bell muted with no hint when the reminder is off', async () => {
    const { ui } = renderActions();
    const view = await renderUi(ui);
    expect(view.getByRole('button', { name: 'تذكير' }).props.accessibilityHint).toBeUndefined();
    expect(tintOf(view.getByRole('button', { name: 'تذكير' }))).toBe(themes.light.colors.inkMuted);
  });

  it('draws the bell in the brand colour with the on hint when the reminder is on', async () => {
    jest.mocked(useAzkarReminder).mockReturnValue(REMINDER);
    const { ui } = renderActions();
    const view = await renderUi(ui);
    expect(view.getByRole('button', { name: 'تذكير' }).props.accessibilityHint).toBe('مفعّل');
    expect(tintOf(view.getByRole('button', { name: 'تذكير' }))).toBe(themes.light.colors.brand);
  });

  it('opens the editor with its reminder row expanded from the bell', async () => {
    const { ui } = renderActions();
    await renderUi(ui);
    await press(screen.getByRole('button', { name: 'تذكير' }));
    expect(router.push).toHaveBeenCalledWith('/duas/mine/edit?id=dua-1&reminder=1');
  });

  it('calls share and text size', async () => {
    const { ui, handlers } = renderActions();
    await renderUi(ui);
    await press(screen.getByRole('button', { name: 'مشاركة' }));
    await press(screen.getByRole('button', { name: 'حجم النص' }));
    expect(handlers.onShare).toHaveBeenCalledTimes(1);
    expect(handlers.onTextSize).toHaveBeenCalledTimes(1);
  });

  it('renders the English labels', async () => {
    const { ui } = renderActions();
    await renderUi(ui, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Reminder' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Share' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/duas/components/MyDuaReaderActions.tsx')).toEqual([]);
  });
});
