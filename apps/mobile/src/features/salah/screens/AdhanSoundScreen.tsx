import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';

import { AdhanSoundHeader } from '../components/AdhanSoundHeader';
import { AdhanSoundList } from '../components/AdhanSoundList';
import { type AdhanVoiceId, getPrayerSound, type PrayerSoundId } from '../data/adhan-sounds';
import { useAdhanPreview } from '../data/adhan-preview';
import { setPrayerSound } from '../data/notifications';

/**
 * The adhan sound picker (ADR 0047), reached from Settings and from the الصلاة screen. It composes the header and the list
 * only. A tap selects the sound at once and saves it without waiting (offline-first: the tap never waits on the schedule).
 * A preview keeps playing while the selection changes; it stops when the screen unmounts.
 */
export function AdhanSoundScreen({ testID }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [selected, setSelected] = useState<PrayerSoundId>(() => getPrayerSound());
  const preview = useAdhanPreview();

  const onSelect = useCallback((id: PrayerSoundId) => {
    setSelected(id);
    void setPrayerSound(id);
  }, []);

  const onTogglePreview = useCallback(
    (id: AdhanVoiceId) => {
      preview.toggle(id);
    },
    [preview],
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.space[4] }} testID={testID}>
        <ContentColumn gutter={0}>
          <View style={{ gap: theme.space[4], paddingHorizontal: theme.space[4] }}>
            <AdhanSoundHeader onBack={() => router.back()} title={t('salah.adhanSound.title')} />
            <AdhanSoundList
              onSelect={onSelect}
              onTogglePreview={onTogglePreview}
              previewingId={preview.playingId}
              progress={preview.progress}
              selected={selected}
            />
          </View>
        </ContentColumn>
      </ScrollView>
    </Screen>
  );
}
