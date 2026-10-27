import { Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { Screen } from './Screen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 59 }) };
});

const colors = themes.light.colors;

describe('Screen', () => {
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
