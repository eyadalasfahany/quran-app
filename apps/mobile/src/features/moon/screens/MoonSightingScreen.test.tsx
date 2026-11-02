import { renderUi } from '../../../../jest/render-ui';

import { MoonSightingScreen } from './MoonSightingScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('@/features/moon/hooks/useMoonLocation', () => ({
  useMoonLocation: () => ({ snapshot: null, pending: false, refresh: async () => {} }),
}));

describe('MoonSightingScreen', () => {
  it('shows no-location when coords are missing', async () => {
    const view = await renderUi(<MoonSightingScreen now={new Date('2026-11-10T12:00:00')} />);
    expect(view.getByTestId('moon-no-location')).toBeOnTheScreen();
  });
});
