import { type Href, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';

import { AboutSection } from '../components/AboutSection';
import { HabitsSection } from '../components/HabitsSection';
import { LanguageSection } from '../components/LanguageSection';
import { ListeningSection } from '../components/ListeningSection';
import { ReadingSection } from '../components/ReadingSection';
import { SettingsHeader } from '../components/SettingsHeader';
import { readDailyReminder, writeDailyReminder } from '../reminder-preference';

export function SettingsScreen({ testID = 'settings-screen' }: { testID?: string }) {
  const theme = useTheme();
  const [reminderEnabled, setReminderEnabled] = useState(readDailyReminder);

  const handleReminderChange = (on: boolean) => {
    setReminderEnabled(on);
    writeDailyReminder(on);
  };

  return (
    <Screen testID={testID}>
      <View style={{ paddingHorizontal: theme.space[4] }}>
        <SettingsHeader onBack={() => router.back()} />
      </View>
      <ScrollView
        contentContainerStyle={{
          gap: theme.space[4],
          paddingBottom: theme.space[6],
          paddingHorizontal: theme.space[4],
          paddingTop: theme.space[4],
        }}
        style={{ flex: 1 }}
      >
        <LanguageSection />
        <ReadingSection
          onPressAppearance={() => router.push('/reader-settings' as Href)}
          onPressQuranFont={() => router.push('/reader-settings' as Href)}
        />
        <ListeningSection
          onPressReciter={() => router.navigate('/(main)/(listen)' as Href)}
        />
        <HabitsSection onReminderChange={handleReminderChange} reminderEnabled={reminderEnabled} />
        <AboutSection onPressSources={() => router.push('/settings/sources' as Href)} />
      </ScrollView>
    </Screen>
  );
}
