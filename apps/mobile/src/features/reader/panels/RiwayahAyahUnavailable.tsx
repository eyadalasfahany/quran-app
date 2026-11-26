import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import type { SvgMushafKey } from '@/core/mushaf-pack';
import { useTheme } from '@/core/theme';
import { SheetHeader, UiText } from '@/shared/ui';

/**
 * The ayah sheet for an ayah tapped on a non-Hafs page (frame AyahSheetRiwayahUnavailable). Its number is the riwayah's
 * own, and the app has no map to Hafs yet, so play, tafsir and marks would land on the wrong ayah: only the reference
 * and a note show, until the ayah map and per-riwayah marks exist (ADR 0090 «Decided» 1, step 15 D7).
 */
export function RiwayahAyahUnavailable({
  riwayah,
  surahName,
  verseNumber,
  onClose,
  testID = 'riwayah-ayah-unavailable',
}: {
  riwayah: SvgMushafKey;
  // The surah's Arabic name, a Quranic word.
  surahName: string;
  verseNumber: number;
  onClose?: () => void;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const ayah = t('reader.ayahPanel.ayah', { number: formatNumber(verseNumber, locale) });

  return (
    <View style={{ gap: theme.space[4] }} testID={testID}>
      <SheetHeader
        closeLabel={t('reader.sheet.close')}
        onClose={onClose}
        size="compact"
        subtitle={t(`reader.mushafs.${riwayah}.name`)}
        testID={`${testID}-header`}
        title={`${surahName} · ${ayah}`}
      />
      <View
        accessibilityRole="text"
        style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.tile, padding: theme.space[3] }}
      >
        <UiText tone="muted" testID={`${testID}-note`} variant="body">
          {t('reader.ayahPanel.riwayahUnavailable')}
        </UiText>
      </View>
    </View>
  );
}
