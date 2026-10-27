import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import type { ChapterRecord } from '@/features/reader/data/chapters';
import { Card, UiText } from '@/shared/ui';

// The Surah index's last-read card: «آخر قراءة: البقرة · الآية ٢٥٥» with «متابعة» on its trailing side.
export function ContinueReadingRow({
  chapter,
  ayah,
  onPress,
  testID = 'index-continue-reading',
}: {
  chapter: ChapterRecord;
  ayah: number;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const label = t('library.index.lastRead', { ayah: formatNumber(ayah, locale), surah: chapter.nameArabic });
  const resume = t('library.index.resume');

  return (
    <Pressable
      accessibilityLabel={`${label}, ${resume}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? theme.opacity.pressed : 1 })}
      testID={testID}
    >
      <Card padding={3} radius="md" style={{ marginBottom: theme.space[3] }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }}>
          <UiText numberOfLines={1} style={{ flex: 1 }} variant="subhead">
            {label}
          </UiText>
          <UiText tone="brand" variant="label">
            {resume}
          </UiText>
        </View>
      </Card>
    </Pressable>
  );
}
