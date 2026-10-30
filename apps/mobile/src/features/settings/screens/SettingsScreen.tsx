import { type Href, router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { useActivePlan } from '@/features/khatma/data';
import { Screen } from '@/shared/ui';

import { AboutSection } from '../components/AboutSection';
import { HabitsSection } from '../components/HabitsSection';
import { LanguageSection } from '../components/LanguageSection';
import { ListeningSection } from '../components/ListeningSection';
import { ReadingSection } from '../components/ReadingSection';
import { SettingsHeader } from '../components/SettingsHeader';

export function SettingsScreen({ testID = 'settings-screen' }: { testID?: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const activePlan = useActivePlan().data[0] ?? null;
  const khatmaValue = useMemo(() => {
    if (activePlan === null) {
      return undefined;
    }
    return t('khatma.settingsDuration', { formatted: formatNumber(activePlan.durationDays, locale) });
  }, [activePlan, locale, t]);

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
        <HabitsSection
          khatmaValue={khatmaValue}
          onPressKhatma={() => router.push('/khatma' as Href)}
        />
        <AboutSection onPressSources={() => router.push('/settings/sources' as Href)} />
      </ScrollView>
    </Screen>
  );
}
