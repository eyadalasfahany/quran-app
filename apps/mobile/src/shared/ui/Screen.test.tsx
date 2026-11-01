import { Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { TabRailContext } from '@/core/layout/TabRailContext';
import { themes } from '@/core/theme';

import { Screen } from './Screen';

// Landscape insets: a 44 pt notch side on the left, 12 on the right. Set per test.
let mockInsets = { bottom: 0, left: 0, right: 0, top: 59 };

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => mockInsets };
});

const colors = themes.light.colors;

describe('Screen', () => {
  beforeEach(() => {
    mockInsets = { bottom: 0, left: 0, right: 0, top: 59 };
  });

  it('fills the window on the screen surface', async () => {
    const view = await renderUi(
      <Screen testID="screen">
        <Text>محتوى</Text>
      </Screen>,
    );

    expect(view.getByText('محتوى')).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('screen').props.style)).toMatchObject({
      backgroundColor: colors.surface,
      flex: 1,
      paddingTop: 59,
    });
  });

  it('pads the leading and trailing edges by the side insets in LTR', async () => {
    mockInsets = { bottom: 0, left: 44, right: 12, top: 0 };
    const view = await renderUi(<Screen testID="screen" />, { locale: 'en' });

    expect(flatStyle(view.getByTestId('screen').props.style)).toMatchObject({ paddingEnd: 12, paddingStart: 44 });
  });

  it('mirrors the side insets in RTL, so the notch side is the trailing one', async () => {
    mockInsets = { bottom: 0, left: 44, right: 12, top: 0 };
    const view = await renderUi(<Screen testID="screen" />, { locale: 'ar' });

    expect(flatStyle(view.getByTestId('screen').props.style)).toMatchObject({ paddingEnd: 44, paddingStart: 12 });
  });

  it('has no side padding on a portrait window without insets', async () => {
    const view = await renderUi(<Screen testID="screen" />);

    expect(flatStyle(view.getByTestId('screen').props.style)).toMatchObject({ paddingEnd: 0, paddingStart: 0 });
  });

  it('puts the reader on the page surface without a top inset', async () => {
    const view = await renderUi(<Screen surface="surfacePage" testID="screen" topInset={false} />);

    expect(flatStyle(view.getByTestId('screen').props.style)).toMatchObject({
      backgroundColor: colors.surfacePage,
      paddingTop: 0,
    });
  });

  it('carries an accessibility label', async () => {
    const view = await renderUi(<Screen accessibilityLabel="2:255" testID="screen" />);

    expect(view.getByLabelText('2:255')).toBeOnTheScreen();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<Screen testID="screen" />, { locale });

    expect(view.getByTestId('screen')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('Screen.tsx')).toEqual([]);
  });
});

describe('Screen beside the tab rail (ADR 0036)', () => {
  beforeEach(() => {
    mockInsets = { bottom: 0, left: 44, right: 12, top: 59 };
  });

  it('keeps the rail clearance on the start edge, after the start safe area, in a tab screen', async () => {
    const view = await renderUi(
      <TabRailContext.Provider value={100}>
        <Screen testID="tab-screen">
          <Text>content</Text>
        </Screen>
      </TabRailContext.Provider>,
      { locale: 'en' },
    );

    expect(flatStyle(view.getByTestId('tab-screen').props.style)).toMatchObject({ paddingStart: 44 + 100, paddingEnd: 12 });
  });

  it('mirrors the rail clearance to the right in Arabic, where the start edge is the right one', async () => {
    const view = await renderUi(
      <TabRailContext.Provider value={100}>
        <Screen testID="tab-screen">
          <Text>content</Text>
        </Screen>
      </TabRailContext.Provider>,
      { locale: 'ar' },
    );

    expect(flatStyle(view.getByTestId('tab-screen').props.style)).toMatchObject({ paddingStart: 12 + 100, paddingEnd: 44 });
  });

  it('adds no rail clearance outside the tabs', async () => {
    const view = await renderUi(
      <Screen testID="stack-screen">
        <Text>content</Text>
      </Screen>,
      { locale: 'en' },
    );

    expect(flatStyle(view.getByTestId('stack-screen').props.style)).toMatchObject({ paddingStart: 44 });
  });
});
