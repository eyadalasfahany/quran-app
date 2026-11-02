import { fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Dimensions } from 'react-native';

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
