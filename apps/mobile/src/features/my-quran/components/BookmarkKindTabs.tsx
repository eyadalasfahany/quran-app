import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Chip } from '@/shared/ui';

export type BookmarkKind = 'quran' | 'hadith';

/** The bookmarks section's kind chips: Quran or Hadith bookmarks. Radio options, like HighlightFilterChips. */
export function BookmarkKindTabs({
  value,
  onChange,
  testID = 'my-quran-bookmark-kinds',
}: {
  value: BookmarkKind;
  onChange: (kind: BookmarkKind) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      accessibilityLabel={t('myQuran.bookmarkKindsLabel')}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}
      testID={testID}
    >
      <Chip
        label={t('myQuran.bookmarkKinds.quran')}
        onPress={() => onChange('quran')}
        role="radio"
        selected={value === 'quran'}
        testID={`${testID}-quran`}
      />
      <Chip
        label={t('myQuran.bookmarkKinds.hadith')}
        onPress={() => onChange('hadith')}
        role="radio"
        selected={value === 'hadith'}
        testID={`${testID}-hadith`}
      />
    </View>
  );
}
