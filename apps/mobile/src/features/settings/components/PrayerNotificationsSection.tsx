import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BELL_PRAYERS } from '@/features/salah/data/bells';
import { prayerSoundName } from '@/features/salah/data/adhan-sounds';
import { usePrayerSound } from '@/features/salah/hooks/usePrayerSound';
import { ListRow, UiText } from '@/shared/ui';

import { PrayerReminderRow } from './PrayerReminderRow';
import { SettingsGroup } from './SettingsGroup';

/**
 * The «إشعارات الصلاة» group in Settings: one switch per obligatory prayer (ADR 0030 §3). It mirrors the five bells on
 * the الصلاة tab and shares their state, so nothing is pre-enabled and the two never disagree. The last row opens the
 * adhan sound picker (ADR 0047) and shows the chosen sound.
 */
export function PrayerNotificationsSection({ testID = 'prayer-notifications-section' }: { testID?: string }) {
  const { t } = useTranslation();
  const sound = usePrayerSound();

  return (
    <SettingsGroup testID={testID} title={t('settings.sections.prayerNotifications')}>
      {BELL_PRAYERS.map((prayer) => (
        <PrayerReminderRow key={prayer} prayer={prayer} />
      ))}
      <ListRow
        chevron
        onPress={() => router.push('/adhan-sound' as Href)}
        testID="prayer-adhan-sound-row"
        title={t('salah.adhanSound.title')}
        trailing={
          <UiText tone="muted" variant="subhead">
            {t(prayerSoundName(sound))}
          </UiText>
        }
      />
    </SettingsGroup>
  );
}
