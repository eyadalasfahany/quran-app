import { highContrast } from '@quran/design-tokens';
import { act, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet, Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { GlassSurface } from './GlassSurface';

const mockLiquidGlass = jest.fn(() => false);

jest.mock('expo-glass-effect', () => ({
  ...jest.requireActual('expo-glass-effect'),
  isLiquidGlassAvailable: () => mockLiquidGlass(),
}));

function listenerFor(event: string) {
  return jest.mocked(AccessibilityInfo.addEventListener).mock.calls.find(([name]) => name === event)?.[1] as
    | ((enabled: boolean) => void)
    | undefined;
}

describe('GlassSurface', () => {
  beforeEach(() => {
    mockLiquidGlass.mockReturnValue(false);
    jest.mocked(AccessibilityInfo.isReduceTransparencyEnabled).mockResolvedValue(false);
    jest.mocked(AccessibilityInfo.isDarkerSystemColorsEnabled).mockResolvedValue(false);
    jest.mocked(AccessibilityInfo.addEventListener).mockClear();
  });

  it('renders children on native glass when it is available and Reduce Transparency is off', async () => {
    mockLiquidGlass.mockReturnValue(true);
    const view = await renderUi(
      <GlassSurface testID="surface">
        <Text>محتوى</Text>
      </GlassSurface>,
    );
    const surface = view.getByTestId('surface');

    expect(view.getByTestId('surface-glass').props.glassEffectStyle).toBe('regular');
    expect(view.getByTestId('surface-glass').props.pointerEvents).toBe('none');
    expect(view.getByTestId('surface-glass').props.colorScheme).toBe('auto');
    expect(flatStyle(surface.props.style)).toMatchObject({ borderRadius: themes.light.radius.xl });
    expect(flatStyle(surface.props.style).backgroundColor).toBeUndefined();
    expect(view.getByText('محتوى')).toBeOnTheScreen();
  });

  it('passes a fixed appearance to the native glass for a surface that is always dark', async () => {
    mockLiquidGlass.mockReturnValue(true);
    const view = await renderUi(<GlassSurface colorScheme="dark" testID="surface" />);

    expect(view.getByTestId('surface-glass', { includeHiddenElements: true }).props.colorScheme).toBe('dark');
  });

  it('falls back to solid glassFallback with a line hairline', async () => {
    const view = await renderUi(<GlassSurface radius="pill" testID="surface" />);

    expect(view.getByTestId('surface').props.glassEffectStyle).toBeUndefined();
    expect(flatStyle(view.getByTestId('surface').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.glassFallback,
      borderColor: themes.light.colors.line,
      borderRadius: themes.light.radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
    });
  });

  it('switches style without fading when Reduce Transparency turns on', async () => {
    mockLiquidGlass.mockReturnValue(true);
    const view = await renderUi(<GlassSurface testID="surface" />);

    await act(async () => {
      listenerFor('reduceTransparencyChanged')?.(true);
    });

    const style = flatStyle(view.getByTestId('surface').props.style);
    expect(view.getByTestId('surface').props.glassEffectStyle).toBeUndefined();
    expect(style.backgroundColor).toBe(themes.light.colors.glassFallback);
    expect(style.opacity).toBeUndefined();
  });

  it('uses the high-contrast line when Increase Contrast is on', async () => {
    jest.mocked(AccessibilityInfo.isDarkerSystemColorsEnabled).mockResolvedValue(true);
    const view = await renderUi(<GlassSurface testID="surface" />, { theme: 'dark' });

    await waitFor(() =>
      expect(flatStyle(view.getByTestId('surface').props.style).borderColor).toBe(highContrast.dark.line),
    );
  });

  it('passes its accessibility role and label through', async () => {
    const view = await renderUi(
      <GlassSurface accessibilityLabel="أدوات" accessibilityRole="toolbar" testID="surface" />,
    );

    // A container stays non-accessible so screen readers still reach the controls inside it.
    expect(view.getByTestId('surface').props).toMatchObject({
      accessibilityLabel: 'أدوات',
      accessibilityRole: 'toolbar',
    });
  });

  it.each(locales)('renders in %s', async (locale) => {
    const view = await renderUi(
      <GlassSurface testID="surface">
        <Text>{locale}</Text>
      </GlassSurface>,
      { locale },
    );

    expect(view.getByText(locale)).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('GlassSurface.tsx')).toEqual([]);
  });
});
