import { type Href, router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { useActivePlan } from '@/features/khatma/data';
import { Screen } from '@/shared/ui';

import { AboutSection } from '../components/AboutSection';
import { HabitsSection } from '../components/HabitsSection';
import { LanguageSection } from '../components/LanguageSection';
import { ListeningSection } from '../components/ListeningSection';
import { RemindersEntryRow } from '@/features/reminders/components/RemindersEntryRow';
import { WidgetsEntryRow } from '@/features/widgets/components/WidgetsEntryRow';
import { PrayerNotificationsSection } from '../components/PrayerNotificationsSection';
import { ReadingSection } from '../components/ReadingSection';
import { SettingsGroup } from '../components/SettingsGroup';
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
    return t('khatma.settingsDuration', {
      count: activePlan.durationDays,
      formatted: formatNumber(activePlan.durationDays, locale),
    });
  }, [activePlan, locale, t]);

  return (
    <Screen testID={testID}>
      {/* The column caps the rows at 720 on wide windows (spec §4) and keeps the 16 gutter the rows had. */}
      <ContentColumn gutter={theme.space[4]} testID="settings-column">
        <SettingsHeader onBack={() => router.back()} />
        <ScrollView
          contentContainerStyle={{
            gap: theme.space[4],
            paddingBottom: theme.space[6],
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
          <SettingsGroup testID="settings-reminders-hub">
            <RemindersEntryRow subtitle={t('settings.reminders.hubHint')} title={t('settings.reminders.hub')} />
          </SettingsGroup>
          <SettingsGroup testID="settings-widgets-entry">
            <WidgetsEntryRow />
          </SettingsGroup>
          <PrayerNotificationsSection />
          <AboutSection onPressSources={() => router.push('/settings/sources' as Href)} />
        </ScrollView>
      </ContentColumn>
    </Screen>
  );
}
