import { fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderUi } from '../../../../jest/render-ui';
import { MyQuranScreen } from './MyQuranScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), push: jest.fn() },
}));

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => ({ executor: {} }),
  useContentDb: () => ({ error: null, ready: true }),
}));

jest.mock('@/features/library/data', () => ({
  deleteBookmark: jest.fn(),
  setHighlight: jest.fn(),
  useAllHighlights: () => ({ data: [] }),
  useAllNotes: () => ({ data: [] }),
  useBookmarks: () => ({ data: [] }),
}));

jest.mock('../data/saved-items', () => ({
  resolveSavedVerses: () => [],
}));

jest.mock('@/features/khatma/data', () => ({
  ...jest.requireActual<typeof import('@/features/khatma/data')>('@/features/khatma/data'),
  useActivePlan: () => ({ data: [] }),
  usePlanLogs: () => ({ data: [] }),
}));

describe('MyQuranScreen', () => {
  beforeEach(() => {
    jest.mocked(router.push).mockClear();
    jest.mocked(router.navigate).mockClear();
  });

  it('renders «مصحفي» with the settings gear, and the gear opens settings', async () => {
    const view = await renderUi(<MyQuranScreen />);

    expect(view.getByRole('header', { name: 'مصحفي' })).toBeOnTheScreen();

    fireEvent.press(view.getByRole('button', { name: 'الإعدادات' }));

    expect(router.push).toHaveBeenCalledWith('/settings');
  });

  it('opens on the bookmarks section and switches sections with the segment', async () => {
    const view = await renderUi(<MyQuranScreen />);

    expect(view.getByText('لا توجد علامات بعد')).toBeOnTheScreen();

    // State updates flush on the microtask queue (React 19), so the new section is awaited.
    fireEvent.press(view.getByRole('tab', { name: 'التظليلات' }));
    await view.findByText('لا توجد تظليلات بعد');

    fireEvent.press(view.getByRole('tab', { name: 'الملاحظات' }));
    await view.findByText('لا توجد ملاحظات بعد');
  });

  it('navigates to the mushaf tab from an empty state', async () => {
    const view = await renderUi(<MyQuranScreen />);

    fireEvent.press(view.getByRole('button', { name: 'افتح المصحف' }));

    expect(router.navigate).toHaveBeenCalledWith('/(main)/(mushaf)');
  });

});
