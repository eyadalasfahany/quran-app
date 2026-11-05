import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { goBackOr, MENU_TAB } from '@/core/navigation/go-back';
import { azkarHref } from '@/features/azkar/routes';
import { useAzkarAvailable, useAzkarCategories } from '@/features/azkar/data';
import { useHasReminderLocation, useNotificationsGranted } from '@/features/azkar/reminders/hooks';
import { planAzkarBudget } from '@/features/azkar/reminders/budget-plan';
import { BELL_PRAYERS } from '@/features/salah/data/bells';
import { PrayerReminderRow } from '@/features/settings/components/PrayerReminderRow';
import { DailyReminderRow } from '@/features/settings/components/DailyReminderRow';
import { SettingsGroup } from '@/features/settings/components/SettingsGroup';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { ListRow, Screen } from '@/shared/ui';

import { ReminderLimitDialog } from '../components/ReminderLimitDialog';
import { FridayReminderBlock } from '../components/FridayReminderBlock';
import { MisbahaReminderBlock } from '../components/MisbahaReminderBlock';
import { ReminderPermissionDialog } from '../components/ReminderPermissionDialog';
import { ReminderRow } from '../components/ReminderRow';
import { RemindersIntro } from '../components/RemindersIntro';
// import { TestReminderButton } from '../components/TestReminderButton';
import { azkarDetail } from '../data/azkar-detail';
import { setAzkarSessionReminder } from '../data/azkar-session';
import { azkarStatus } from '../data/hub-status';
import { useAzkarReminderRows } from '../data/live';
import { useRecommendedPrompt } from '../hooks/useRecommendedPrompt';

const SALAH_HREF = '/salah' as Href;

/**
 * The reminders hub (`/reminders`; ADR 0034, the 2 Nov 2026 hub decision). One place for every reminder: the prayer bells,
 * the Azkar sessions, the daily reading reminder, the Friday Surat al-Kahf and the misbaha target, and the test notification.
 * The first visit with notifications allowed and nothing on yet offers the recommended set once. Composition and wiring only.
 */
export function RemindersScreen({ testID = 'reminders-screen' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const { granted, refresh } = useNotificationsGranted();
  const hasAzkar = useAzkarAvailable();
  const categories = useAzkarCategories(locale);
  const reminders = useAzkarReminderRows();
  const unscheduled = useMemo(() => new Set(planAzkarBudget(reminders).unscheduled), [reminders]);
  const hasLocation = useHasReminderLocation(reminders.some((reminder) => reminder.enabled && reminder.triggerType === 'prayer_relative'));
  const [denied, setDenied] = useState(false);
  const [limited, setLimited] = useState(false);
  useRecommendedPrompt(granted);

  const sessions = categories.filter((category) => category.kind === 'session');

  const toggleSession = (categoryId: string, on: boolean) => {
    void setAzkarSessionReminder(categoryId, on).then((result) => {
      if (result === 'limit') {
        setLimited(true);
      } else if (result === 'denied') {
        setDenied(true);
        refresh();
      }
    });
  };

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.space[4]} testID="reminders-column">
        <SettingsHeader onBack={() => goBackOr(MENU_TAB)} testID="reminders-header" title={t('reminders.title')} />
        <ScrollView
          contentContainerStyle={{ gap: theme.space[4], paddingBottom: theme.space[6], paddingTop: theme.space[4] }}
          style={{ flex: 1 }}
        >
          <RemindersIntro />

          <SettingsGroup testID="reminders-prayer" title={t('reminders.sections.prayer')}>
            <ListRow
              onPress={() => router.push(SALAH_HREF)}
              subtitle={t('reminders.prayerSummaryHint')}
              testID="reminders-prayer-summary"
              title={t('reminders.prayerSummary')}
            />
            {BELL_PRAYERS.map((prayer) => (
              <PrayerReminderRow key={prayer} prayer={prayer} />
            ))}
          </SettingsGroup>

          {hasAzkar ? (
            <SettingsGroup testID="reminders-azkar" title={t('reminders.sections.azkar')}>
              {sessions.map((category) => {
                const reminder = reminders.find((row) => row.targetType === 'category' && row.targetKey === category.id) ?? null;
                return (
                  <ReminderRow
                    detail={azkarDetail(reminder, locale)}
                    key={category.id}
                    onPress={() => router.push(azkarHref.reminders({ category: category.id }))}
                    onValueChange={(on) => toggleSession(category.id, on)}
                    status={azkarStatus(reminder, {
                      granted,
                      unscheduled: reminder !== null && unscheduled.has(reminder.id),
                      hasLocation,
                    })}
                    testID={`reminders-azkar-${category.id}`}
                    title={t(`azkar.categories.${category.id}` as never)}
                    value={reminder?.enabled ?? false}
                  />
                );
              })}
            </SettingsGroup>
          ) : null}

          <SettingsGroup testID="reminders-daily" title={t('reminders.sections.daily')}>
            <DailyReminderRow />
            <FridayReminderBlock granted={granted} />
            <MisbahaReminderBlock granted={granted} />
          </SettingsGroup>

          {/* <TestReminderButton /> */}
        </ScrollView>
      </ContentColumn>
      <ReminderLimitDialog onClose={() => setLimited(false)} visible={limited} />
      <ReminderPermissionDialog onClose={() => setDenied(false)} visible={denied} />
    </Screen>
  );
}
