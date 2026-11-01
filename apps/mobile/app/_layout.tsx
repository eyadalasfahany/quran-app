import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nManager, Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import '@/core/layout/hide-scroll-indicators';
import { syncDailyReminder } from '@/features/notifications/reminder-service';
import { registerReminderDeepLinks } from '@/features/notifications/reminder-deeplink';
import { openContentDb, useContentDb } from '@/core/db/content/open';
import { useUserDb } from '@/core/db/user/open';
import { ensureDirection } from '@/core/i18n';
import { modalLikeScreenOptions, pushScreenOptions } from '@/core/layout/push-screen-options';
import { useContentSync } from '@/core/sync/use-content-sync';
import { bundledFonts, ThemeProvider, themes, useResolvedTheme } from '@/core/theme';
import { useDownloadManagerStartup } from '@/features/audio/hooks/useDownloadManagerStartup';
import { useRestorePlayerSession } from '@/features/audio/hooks/useRestorePlayerSession';
import { azkarDevFixturesEnabled, loadAzkarDevFixtures } from '@/features/azkar/data/dev-fixtures';
import { useAzkarRemindersForeground } from '@/features/azkar/reminders/use-azkar-reminders-foreground';
import { resyncAzkarReminders } from '@/features/azkar/reminders/resync';
import { usePrayerNotificationsSync } from '@/features/salah/hooks/usePrayerNotificationsSync';
import { usePlaybackReadingPlace } from '@/features/reader/anchor/usePlaybackReadingPlace';
import { sheetScreenOptions } from '@/features/reader/form-sheet';

void SplashScreen.preventAutoHideAsync();

// Sheets are transparent modals. A modal that is the first native-stack screen
// is drawn as a card, so the tabs stay underneath every sheet.
export const unstable_settings = {
  anchor: '(main)',
};

// A direction mismatch reloads before paint, so the splash stays up.
const directionCheck = ensureDirection();

export default function RootLayout() {
  const themeName = useResolvedTheme();
  const reduceMotion = useReducedMotion() ?? false;
  const pushOptions = pushScreenOptions({ isRTL: I18nManager.isRTL, platform: Platform.OS, reduceMotion });
  const modalLikeOptions = modalLikeScreenOptions({ platform: Platform.OS, reduceMotion });
  const [loaded, error] = useFonts(bundledFonts);
  const [directionReady, setDirectionReady] = useState(directionCheck.ready);
  const content = useContentDb();
  const user = useUserDb();
  useContentSync();
  usePlaybackReadingPlace(content.ready);
  useRestorePlayerSession(content.ready);
  useDownloadManagerStartup(content.ready && user.ready);
  // A font that fails to load falls back to the system font rather than holding the splash.
  // A database error is logged and the reader deals with an empty database later.
  const ready =
    (loaded || error !== null) &&
    directionReady &&
    (content.ready || content.error !== null) &&
    (user.ready || user.error !== null);
  // Re-plans the Azkar reminders when the day, the time zone or the location changed while the app was away.
  useAzkarRemindersForeground(ready);
  // Re-plans the prayer notifications on launch, on foreground and on a location change (ADR 0030 §3).
  usePrayerNotificationsSync(ready);

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
    if (content.error) {
      console.error(content.error);
    }
  }, [content.error]);

  useEffect(() => {
    if (user.error) {
      console.error(user.error);
    }
  }, [user.error]);

  // Development only: placeholder Azkar rows for the UI (never shipped; see dev-fixtures.ts).
  useEffect(() => {
    if (!content.ready || !azkarDevFixturesEnabled()) {
      return;
    }
    try {
      loadAzkarDevFixtures(openContentDb().executor);
    } catch (error) {
      console.error(error);
    }
  }, [content.ready]);

  useEffect(() => {
    if (ready) {
      void syncDailyReminder();
      void resyncAzkarReminders();
      registerReminderDeepLinks();
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <ThemeProvider name={themeName}>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: themes[themeName].colors.surface } }}
      >
        <Stack.Screen name="reader-settings" options={sheetScreenOptions} />
        <Stack.Screen name="daily-goals" options={sheetScreenOptions} />
        <Stack.Screen name="ayah/[verseKey]" options={sheetScreenOptions} />
        <Stack.Screen name="azkar/details/[entryKey]" options={sheetScreenOptions} />
        <Stack.Screen name="azkar/reminders" options={sheetScreenOptions} />
        <Stack.Screen name="tafsir/[verseKey]" options={sheetScreenOptions} />
        <Stack.Screen name="player" options={sheetScreenOptions} />
        <Stack.Screen name="azkar/index" options={pushOptions} />
        <Stack.Screen name="azkar/category/[id]" options={pushOptions} />
        <Stack.Screen name="azkar/search" options={pushOptions} />
        <Stack.Screen name="azkar/favorites" options={pushOptions} />
        <Stack.Screen name="azkar/downloads" options={pushOptions} />
        <Stack.Screen name="azkar/read/[categoryId]" options={modalLikeOptions} />
        <Stack.Screen name="azkar/entry/[entryKey]" options={modalLikeOptions} />
        <Stack.Screen name="sibha" options={pushOptions} />
      </Stack>
    </ThemeProvider>
  );
}
