import { fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { themes, ThemeProvider, useResolvedTheme } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../../jest/render-ui';
import { ThemePicker } from './ThemePicker';

function ThemeProbe() {
  const name = useResolvedTheme();
  return (
    <ThemeProvider name={name}>
      <ThemePicker />
      <Text testID="theme-name">{name}</Text>
      <Text testID="theme-ink">{themes[name].colors.ink}</Text>
    </ThemeProvider>
  );
}

describe('ThemePicker', () => {
  beforeEach(() => {
    storage.remove(storageKeys.appearance);
  });

  it.each(locales)('labels every appearance in %s', async (locale) => {
    const view = await renderUi(<ThemePicker />, { locale });
    for (const label of locale === 'ar' ? ['تلقائي', 'فاتح', 'سيبيا', 'داكن'] : ['System', 'Light', 'Sepia', 'Dark']) {
      expect(view.getByText(label)).toBeOnTheScreen();
    }
  });

  it('is a labelled tab list with one tab per appearance, in frame order', async () => {
    const view = await renderUi(<ThemePicker />);

    expect(view.getByTestId('reader-theme').props).toMatchObject({
      accessibilityLabel: 'المظهر',
      accessibilityRole: 'tablist',
    });
    expect(view.getAllByRole('tab').map((tab) => tab.props.testID)).toEqual([
      'reader-theme-automatic',
      'reader-theme-light',
      'reader-theme-sepia',
      'reader-theme-dark',
    ]);
  });

  it('shows the appearance dot inside each segment', async () => {
    const view = await renderUi(<ThemePicker />);

    for (const option of ['automatic', 'light', 'sepia', 'dark'] as const) {
      expect(view.getByTestId(`reader-theme-${option}`)).toContainElement(
        view.getByTestId(`theme-dot-${option}`, { includeHiddenElements: true }),
      );
    }
  });

  it('drops the headline title, which the settings section label now shows', async () => {
    const view = await renderUi(<ThemePicker />);

    expect(view.queryByText('المظهر')).toBeNull();
  });

  it('saves sepia and the resolved theme follows it', async () => {
    const view = await renderUi(<ThemeProbe />);
    await fireEvent.press(view.getByTestId('reader-theme-sepia'));
    expect(storage.getString(storageKeys.appearance)).toBe('sepia');
    expect(view.getByTestId('theme-name')).toHaveTextContent('sepia');
    expect(view.getByTestId('theme-ink')).toHaveTextContent(themes.sepia.colors.ink);
  });

  it('marks only the saved appearance as the selected tab', async () => {
    const view = await renderUi(<ThemePicker />);
    await fireEvent.press(view.getByTestId('reader-theme-dark'));

    expect(view.getByTestId('reader-theme-dark').props.accessibilityState).toEqual({ selected: true });
    expect(view.getByTestId('reader-theme-light').props.accessibilityState).toEqual({ selected: false });
    expect(flatStyle(view.getByTestId('reader-theme-dark').props.style).backgroundColor).toBe(
      themes.light.colors.surfaceRaised,
    );
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/settings/components/ThemePicker.tsx')).toEqual([]);
  });
});
