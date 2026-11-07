import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { SearchField, UiText } from '@/shared/ui';

// The cancel target is at least 44 high (HIG). The shared SearchField is 48 (Open question 8).
const CANCEL_MIN_HEIGHT = 44;

/** The search row's field and its cancel text. The back button is the screen's. */
export function HadithSearchField({
  value,
  onChangeText,
  onSubmit,
  onCancel,
  autoFocus = false,
  testID = 'hadith-search-field',
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }} testID={testID}>
      <View style={{ flex: 1 }}>
        <SearchField
          autoFocus={autoFocus}
          onChangeText={onChangeText}
          onSubmit={onSubmit}
          placeholder={t('hadith.search.placeholder')}
          testID={`${testID}-field`}
          value={value}
        />
      </View>
      <Pressable
        accessibilityLabel={t('hadith.search.cancel')}
        accessibilityRole="button"
        onPress={onCancel}
        style={({ pressed }) => ({
          justifyContent: 'center',
          minHeight: CANCEL_MIN_HEIGHT,
          opacity: pressed ? theme.opacity.pressed : 1,
          paddingHorizontal: 4,
        })}
        testID={`${testID}-cancel`}
      >
        <UiText tone="brand" variant="body" weight={600}>
          {t('hadith.search.cancel')}
        </UiText>
      </Pressable>
    </View>
  );
}
