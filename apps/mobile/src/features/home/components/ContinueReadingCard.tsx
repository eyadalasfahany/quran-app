import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

const MUSHAF_PAGES = 604;
const TRACK_HEIGHT = 4;
const TRACK_OPACITY = 0.2;

// Home's Continue reading card: the surah in Amiri on the brand surface, where the reader stopped,
// and how far through the mushaf that page is.
export function ContinueReadingCard({
  surahName,
  ayah,
  page,
  juz,
  onPress,
  testID = 'home-continue-reading',
}: {
  surahName: string;
  ayah: number;
  page: number;
  juz: number;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const title = t('reader.surahTitle', { name: surahName });
  const place = t('home.place', { ayah: formatNumber(ayah, locale), juz: formatNumber(juz, locale), page: formatNumber(page, locale) });
  const percent = Math.round((page / MUSHAF_PAGES) * 100);
  const track = { borderRadius: TRACK_HEIGHT / 2, height: TRACK_HEIGHT };

  return (
    <Pressable
      accessibilityHint={t('home.progress', { percent: formatNumber(percent, locale) })}
      accessibilityLabel={`${t('home.continueReading')}, ${title}, ${place}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: theme.colors.brandSurface,
        borderRadius: theme.radius.lg,
        gap: theme.space[2],
        opacity: pressed ? theme.opacity.pressed : 1,
        padding: theme.space[5],
      })}
      testID={testID}
    >
      <UiText tone="onBrandMuted" variant="label">
        {t('home.continueReading')}
      </UiText>
      <UiText tone="onBrand" variant="displayLg">
        {title}
      </UiText>
      <UiText tone="onBrandMuted" variant="subhead">
        {place}
      </UiText>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3], marginTop: theme.space[1] }}>
        <View style={[track, { flex: 1, overflow: 'hidden' }]} testID={`${testID}-track`}>
          <View style={[track, { backgroundColor: theme.colors.onBrandSurface, opacity: TRACK_OPACITY }, StyleSheet.absoluteFill]} />
          <View style={[track, { backgroundColor: theme.colors.gold, width: `${percent}%` }]} testID={`${testID}-progress`} />
        </View>
        <UiText tone="onBrand" variant="label">
          {t('home.resume')}
        </UiText>
      </View>
    </Pressable>
  );
}
