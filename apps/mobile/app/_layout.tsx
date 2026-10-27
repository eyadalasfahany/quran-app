import type { ThemeName } from '@quran/design-tokens';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { ThemeProvider, themes, uiFonts } from '@/core/theme';

void SplashScreen.preventAutoHideAsync();

// The saved theme choice is read from MMKV once storage exists.
const themeName: ThemeName = 'light';

export default function RootLayout() {
  const [loaded, error] = useFonts(uiFonts);
  // A font that fails to load falls back to the system font rather than holding the splash.
  const ready = loaded || error !== null;

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <ThemeProvider name={themeName}>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: themes[themeName].colors.surface } }}
      />
    </ThemeProvider>
  );
}
