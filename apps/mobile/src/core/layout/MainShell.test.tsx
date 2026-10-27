import { fireEvent } from '@testing-library/react-native';
import { router, useSegments } from 'expo-router';
import { Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { featureComponentLiterals } from '../../../jest/ui-source';
import { ThemeProvider, themes } from '@/core/theme';

import { MainShell } from './MainShell';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn() },
  useSegments: jest.fn(() => ['(main)', '(home)']),
}));

const labels = {
  ar: { nav: 'التنقل الرئيسي', mushaf: 'المصحف' },
  en: { nav: 'Main navigation', mushaf: 'Mushaf' },
} as const;

function shell(expanded: boolean) {
  return (
    <MainShell expanded={expanded}>
      <Text>tabs</Text>
    </MainShell>
  );
}

describe('MainShell', () => {
  beforeEach(() => {
    jest.mocked(router.navigate).mockClear();
    jest.mocked(useSegments).mockReturnValue(['(main)', '(home)']);
  });

  it('renders only the tabs on compact and medium windows', async () => {
    const view = await renderUi(shell(false));

    expect(view.getByText('tabs')).toBeOnTheScreen();
    expect(view.queryByTestId('sidebar')).toBeNull();
    expect(flatStyle(view.getByTestId('main-shell').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surface,
      flex: 1,
    });
  });

  it('adds the sidebar beside the tabs on expanded windows', async () => {
    const view = await renderUi(shell(true));

    expect(view.getByTestId('sidebar')).toBeOnTheScreen();
    expect(view.getByText('tabs')).toBeOnTheScreen();
    expect(view.getAllByRole('tab').map((tab) => tab.props.testID)).toEqual([
      'sidebar-home',
      'sidebar-mushaf',
      'sidebar-listen',
      'sidebar-my-quran',
    ]);
  });

  it('selects the destination of the current route', async () => {
    jest.mocked(useSegments).mockReturnValue(['(main)', '(mushaf)']);
    const view = await renderUi(shell(true));

    expect(view.getByTestId('sidebar-mushaf').props.accessibilityState).toEqual({ selected: true });
    expect(view.getByTestId('sidebar-home').props.accessibilityState).toEqual({ selected: false });
  });

  it('keeps the tab under a sheet selected while the sheet is open', async () => {
    jest.mocked(useSegments).mockReturnValue(['(main)', '(mushaf)']);
    const view = await renderUi(shell(true));

    jest.mocked(useSegments).mockReturnValue(['reader-settings'] as unknown as ReturnType<typeof useSegments>);
    await view.rerender(<ThemeProvider name="light">{shell(true)}</ThemeProvider>);

    expect(view.getByTestId('sidebar-mushaf').props.accessibilityState).toEqual({ selected: true });
    expect(view.getByTestId('sidebar-home').props.accessibilityState).toEqual({ selected: false });
  });

  it('falls back to home when no destination matches', async () => {
    jest.mocked(useSegments).mockReturnValue([] as unknown as ReturnType<typeof useSegments>);
    const view = await renderUi(shell(true));

    expect(view.getByTestId('sidebar-home').props.accessibilityState).toEqual({ selected: true });
  });

  it('navigates to a destination from the sidebar', async () => {
    const view = await renderUi(shell(true));

    await fireEvent.press(view.getByTestId('sidebar-listen'));

    expect(router.navigate).toHaveBeenCalledWith('/(main)/(listen)');
  });

  it.each(locales)('labels the sidebar and its tabs in %s', async (locale) => {
    const view = await renderUi(shell(true), { locale });

    expect(view.getByTestId('sidebar').props.accessibilityLabel).toBe(labels[locale].nav);
    expect(view.getByRole('tab', { name: labels[locale].mushaf })).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('main-shell').props.style).flexDirection).toBe('row');
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('core/layout/MainShell.tsx')).toEqual([]);
  });
});
