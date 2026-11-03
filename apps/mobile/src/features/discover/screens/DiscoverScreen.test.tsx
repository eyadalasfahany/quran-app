import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { storage } from '@/core/storage/mmkv';
import { readDiscoverState, startTour } from '../store';

import { DiscoverScreen } from './DiscoverScreen';

jest.mock('expo-router', () => ({
  ...jest.requireActual<typeof import('expo-router')>('expo-router'),
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn() },
}));

// The screen reads the safe area; the test has no native provider, so the insets are zero.
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

beforeEach(() => {
  storage.clearAll();
  jest.clearAllMocks();
});

describe('DiscoverScreen', () => {
  it('lists the five groups with their rows and the progress summary', async () => {
    const view = await renderUi(<DiscoverScreen />, { locale: 'ar' });
    expect(view.getByRole('header', { name: 'اكتشف طيبة' })).toBeOnTheScreen();
    expect(view.getByText('٠ من ١٣ مكتملة')).toBeOnTheScreen();
    for (const group of ['القراءة', 'مصحفي', 'الاستماع', 'العبادات', 'التطبيق']) {
      expect(view.getByRole('header', { name: group })).toBeOnTheScreen();
    }
    expect(view.getByTestId('discover-row-reader.tafsir')).toBeOnTheScreen();
    expect(view.getByTestId('discover-row-app.widget')).toBeOnTheScreen();
  });

  it('starts the guided tour at the tapped row', async () => {
    const view = await renderUi(<DiscoverScreen />, { locale: 'ar' });
    await fireEvent.press(view.getByTestId('discover-row-worship.sibha'));
    expect(readDiscoverState().tourStep).toBe('worship.sibha');
  });

  it('opens the widget sheet on the tour’s widget step, and «تم» ticks the row and finishes the tour', async () => {
    const view = await renderUi(<DiscoverScreen />, { locale: 'ar' });
    await fireEvent.press(view.getByTestId('discover-row-app.widget'));
    await fireEvent.press(view.getByRole('button', { name: 'تم' }));

    expect(view.getByRole('button', { name: 'أضف الودجت (اختياري), تم' })).toBeOnTheScreen();
    expect(readDiscoverState().tourStep).toBeNull();
  });

  it('closing the widget sheet on the tour skips the step, which counts as done', async () => {
    startTour('app.widget');
    const view = await renderUi(<DiscoverScreen />, { locale: 'ar' });
    await fireEvent.press(view.getByTestId('discover-widget-scrim'));

    expect(readDiscoverState()).toMatchObject({ done: ['app.widget'], tourStep: null });
  });

  it('opens the widget sheet straight away when asked to', async () => {
    const view = await renderUi(<DiscoverScreen openSheet />, { locale: 'ar' });
    expect(view.getByRole('header', { name: 'أضف الودجت' })).toBeOnTheScreen();
  });
});
