import { highContrast } from '@quran/design-tokens';
import { waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../../jest/render-ui';
import { ThemeDot, THEME_DOT_SIZE } from './ThemeDot';

// The dot is hidden from accessibility on purpose, so queries include hidden elements.
const hidden = { includeHiddenElements: true };

describe('ThemeDot', () => {
  beforeEach(() => {
    jest.mocked(AccessibilityInfo.isDarkerSystemColorsEnabled).mockResolvedValue(false);
  });

  it('draws a 12 pt circle with a hairline in the line colour', async () => {
    const { colors, stroke } = themes.light;
    const view = await renderUi(<ThemeDot appearance="light" />);

    expect(flatStyle(view.getByTestId('theme-dot-light', hidden).props.style)).toMatchObject({
      borderColor: colors.line,
      borderRadius: THEME_DOT_SIZE / 2,
      borderWidth: stroke.hairline,
      height: 12,
      overflow: 'hidden',
      width: 12,
    });
    expect(THEME_DOT_SIZE).toBe(12);
  });

  it.each([
    ['light', themes.light.colors.surfacePage],
    ['sepia', themes.sepia.colors.surfacePage],
    ['dark', themes.dark.colors.surfacePage],
  ] as const)('fills the %s dot with that theme page colour', async (appearance, surface) => {
    const view = await renderUi(<ThemeDot appearance={appearance} />);

    expect(view.queryByTestId(`theme-dot-${appearance}-half-1`, hidden)).toBeNull();
    expect(flatStyle(view.getByTestId(`theme-dot-${appearance}-half-0`, hidden).props.style).backgroundColor).toBe(surface);
  });

  it('splits the automatic dot: light page on the left half, dark page on the right', async () => {
    const view = await renderUi(<ThemeDot appearance="automatic" />);

    expect(flatStyle(view.getByTestId('theme-dot-automatic-half-0', hidden).props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surfacePage,
      flex: 1,
    });
    expect(flatStyle(view.getByTestId('theme-dot-automatic-half-1', hidden).props.style)).toMatchObject({
      backgroundColor: themes.dark.colors.surfacePage,
      flex: 1,
    });
  });

  it.each(locales)('keeps the halves physical, not mirrored, in %s', async (locale) => {
    const view = await renderUi(<ThemeDot appearance="automatic" />, { locale });

    expect(flatStyle(view.getByTestId('theme-dot-automatic', hidden).props.style)).toMatchObject({
      direction: 'ltr',
      flexDirection: 'row',
    });
  });

  it('is hidden from assistive technology', async () => {
    const view = await renderUi(<ThemeDot appearance="sepia" />);
    const dot = view.getByTestId('theme-dot-sepia', hidden);

    expect(dot.props.accessibilityElementsHidden).toBe(true);
    expect(dot.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('uses the high-contrast line colour when Increase Contrast is on', async () => {
    jest.mocked(AccessibilityInfo.isDarkerSystemColorsEnabled).mockResolvedValue(true);
    const view = await renderUi(<ThemeDot appearance="dark" />);

    await waitFor(() =>
      expect(flatStyle(view.getByTestId('theme-dot-dark', hidden).props.style).borderColor).toBe(highContrast.light.line),
    );
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/settings/components/ThemeDot.tsx')).toEqual([]);
  });
});
