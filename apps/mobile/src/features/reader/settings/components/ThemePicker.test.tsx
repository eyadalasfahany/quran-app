import { fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { themes, ThemeProvider, useResolvedTheme } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../../jest/feature-ui-source';
import { locales, renderUi } from '../../../../../jest/render-ui';
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
      expect(view.getByLabelText(label)).toBeOnTheScreen();
    }
  });

  it('saves sepia and the resolved theme follows it', async () => {
    const view = await renderUi(<ThemeProbe />);
    await fireEvent.press(view.getByTestId('reader-theme-sepia'));
    expect(storage.getString(storageKeys.appearance)).toBe('sepia');
    expect(view.getByTestId('theme-name')).toHaveTextContent('sepia');
    expect(view.getByTestId('theme-ink')).toHaveTextContent(themes.sepia.colors.ink);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/settings/components/ThemePicker.tsx')).toEqual([]);
  });
});
