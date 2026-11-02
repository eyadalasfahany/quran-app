import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';
import {
  ADHAN_VOICES,
  DEFAULT_PRAYER_SOUND,
  PRAYER_SOUND_IDS,
  prayerSoundName,
  type AdhanVoiceId,
  type PrayerSoundId,
} from '../data/adhan-sounds';

import { AdhanSoundRow } from './AdhanSoundRow';

const VOICE_IDS: ReadonlySet<PrayerSoundId> = new Set<PrayerSoundId>(ADHAN_VOICES.map((voice) => voice.id));

function isVoice(id: PrayerSoundId): id is AdhanVoiceId {
  return VOICE_IDS.has(id);
}

/**
 * The grouped card of the adhan sound picker, in the order of `PRAYER_SOUND_IDS` (voices, system, silent), with the footer
 * note under it (quran-app-screens.html, #AdhanSoundPicker). The preview state comes from the screen; this component only
 * draws it.
 */
export function AdhanSoundList({
  selected,
  previewingId,
  progress,
  onSelect,
  onTogglePreview,
  testID = 'adhan-sound-list',
}: {
  selected: PrayerSoundId;
  /** The voice that is previewing, or null. */
  previewingId: AdhanVoiceId | null;
  /** 0 to 1 through the previewing clip. */
  progress: number;
  onSelect: (id: PrayerSoundId) => void;
  onTogglePreview: (id: AdhanVoiceId) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const title = t('salah.adhanSound.title');
  const lastIndex = PRAYER_SOUND_IDS.length - 1;

  return (
    <View style={{ gap: theme.space[1] + 2 }} testID={testID}>
      <View
        accessibilityLabel={title}
        accessibilityRole="radiogroup"
        style={{
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: colors.line,
          borderRadius: theme.radius.lg,
          borderWidth: theme.stroke.hairline,
          overflow: 'hidden',
        }}
        testID={`${testID}-card`}
      >
        {PRAYER_SOUND_IDS.map((id, index) => {
          const voice = isVoice(id);
          const playing = voice && previewingId === id;
          return (
            <AdhanSoundRow
              isDefault={id === DEFAULT_PRAYER_SOUND}
              key={id}
              name={t(prayerSoundName(id))}
              onSelect={() => onSelect(id)}
              preview={
                voice
                  ? {
                      onToggle: () => onTogglePreview(id),
                      playing,
                      progress: playing ? progress : 0,
                    }
                  : undefined
              }
              selected={selected === id}
              separator={index < lastIndex}
              testID={`${testID}-${id}`}
            />
          );
        })}
      </View>
      <UiText style={{ marginHorizontal: theme.space[1] + 2 }} testID={`${testID}-footer`} tone="muted" variant="caption">
        {t('salah.adhanSound.footer')}
      </UiText>
    </View>
  );
}
