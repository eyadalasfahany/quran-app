import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { IconButton, uiTextProps } from '@/shared/ui';
import { useContrastColors } from '@/shared/ui/useContrastColors';

const CLOSE = { ios: 'xmark', android: 'close' } as const;

export function PanelHeader({
  surahName,
  verseNumber,
  page,
  juz,
  onClose,
  closeLabel,
  testID = 'panel-header',
}: {
  // The surah's Arabic name, a Quranic word: always right to left.
  surahName: string;
  verseNumber: number;
  page: number | null;
  juz: number | null;
  // The side panel has its own close; sheets pass one here.
  onClose?: () => void;
  closeLabel?: string;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const ayah = t('reader.ayahPanel.ayah', { number: formatNumber(verseNumber, locale) });
  const place =
    page === null || juz === null
      ? null
      : t('reader.toolbar.place', { juz: formatNumber(juz, locale), page: formatNumber(page, locale) });

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }} testID={testID}>
      <View style={{ flex: 1, gap: 2 }}>
        <View
          accessibilityLabel={`${surahName} · ${ayah}`}
          accessibilityRole="header"
          accessible
          style={{ alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[1] }}
        >
          <Text
            {...uiTextProps('headline')}
            style={[theme.text.headline, { color: theme.colors.ink, writingDirection: 'rtl' }]}
            testID={`${testID}-surah`}
          >
            {surahName}
          </Text>
          <Text {...uiTextProps('headline')} style={[theme.text.headline, { color: colors.inkMuted }]}>
            ·
          </Text>
          <Text {...uiTextProps('headline')} style={[theme.text.headline, { color: theme.colors.ink }]} testID={`${testID}-ayah`}>
            {ayah}
          </Text>
        </View>
        {place === null ? null : (
          <Text {...uiTextProps('caption')} style={[theme.text.caption, { color: colors.inkMuted }]} testID={`${testID}-place`}>
            {place}
          </Text>
        )}
      </View>
      {onClose ? (
        <IconButton
          icon={CLOSE}
          label={closeLabel ?? t('reader.sheet.close')}
          onPress={onClose}
          testID={`${testID}-close`}
          variant="filled"
        />
      ) : null}
    </View>
  );
}
