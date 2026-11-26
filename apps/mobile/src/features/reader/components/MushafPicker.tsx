import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { OnboardingRadioCard } from '@/shared/ui';

import { MUSHAF_EDITION_YEAR, PICKABLE_MUSHAF_KEYS, type MushafKey } from '../mushafs';

const BYTES_PER_MEGABYTE = 1_000_000;

/**
 * The mushaf choice (ADR 0090 decision 2): one radio card per riwayah, in the reader settings sheet, Settings › Reading
 * and onboarding. Each card's second line is the publisher and edition year, then the download state or size.
 */
export function MushafPicker({
  value,
  onChange,
  downloaded,
  sizeBytes,
  accessibilityLabel,
  testID = 'mushaf-picker',
}: {
  value: MushafKey;
  onChange: (mushaf: MushafKey) => void;
  downloaded?: (mushaf: MushafKey) => boolean;
  sizeBytes?: (mushaf: MushafKey) => number | undefined;
  accessibilityLabel: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();

  const select = (mushaf: MushafKey) => {
    if (mushaf === value) {
      return;
    }
    void Haptics.selectionAsync().catch(() => undefined);
    onChange(mushaf);
  };

  const subtitle = (mushaf: MushafKey) => {
    const parts = [
      t('reader.mushafs.publisher'),
      t('reader.mushafs.year', { year: formatNumber(MUSHAF_EDITION_YEAR[mushaf], locale) }),
    ];
    if (downloaded?.(mushaf)) {
      parts.push(t('reader.mushafs.downloaded'));
    } else {
      const bytes = sizeBytes?.(mushaf);
      if (typeof bytes === 'number') {
        const mb = Math.round(bytes / BYTES_PER_MEGABYTE);
        parts.push(t('reader.mushafs.size', { mb: formatNumber(mb, locale) }));
      }
    }
    return parts.join(' · ');
  };

  return (
    <View accessibilityLabel={accessibilityLabel} accessibilityRole="radiogroup" style={{ gap: theme.space[2] }} testID={testID}>
      {PICKABLE_MUSHAF_KEYS.map((mushaf) => (
        <OnboardingRadioCard
          density="compact"
          key={mushaf}
          onPress={() => select(mushaf)}
          selected={mushaf === value}
          subtitle={subtitle(mushaf)}
          testID={`mushaf-${mushaf}`}
          title={t(`reader.mushafs.${mushaf}.name`)}
        />
      ))}
    </View>
  );
}
