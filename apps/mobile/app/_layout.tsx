import type { ThemeName } from '@quran/design-tokens';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { ensureDirection } from '@/core/i18n';
import { ThemeProvider, themes, uiFonts } from '@/core/theme';

void SplashScreen.preventAutoHideAsync();

// Theme stays on light until a later step reads the saved choice.
const themeName: ThemeName = 'light';

// A direction mismatch reloads before paint, so the splash stays up.
const directionCheck = ensureDirection();

export default function RootLayout() {
  const [loaded, error] = useFonts(uiFonts);
  const [directionReady, setDirectionReady] = useState(directionCheck.ready);
  // A font that fails to load falls back to the system font rather than holding the splash.
  const ready = (loaded || error !== null) && directionReady;

  useEffect(() => {
    if (directionCheck.ready) {
      return;
    }
    // Resolves false only when the reload failed: show the app in the current direction.
    void directionCheck.reload.then((reloading) => {
      if (!reloading) {
        setDirectionReady(true);
      }
    });
  }, []);

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
