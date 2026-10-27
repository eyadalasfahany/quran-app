import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { uiTextProps } from '@/shared/ui';
import { useContrastColors } from '@/shared/ui/useContrastColors';

export type TranslationChoice = {
  id: number;
  name: string;
  authorName: string | null;
};

export function TranslationToggleList({
  translations,
  selectedIds,
  onChange,
  testID = 'reader-translations',
}: {
  translations: readonly TranslationChoice[];
  selectedIds: readonly number[];
  onChange: (ids: number[]) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selected) => selected !== id));
      return;
    }
    onChange([...selectedIds, id]);
  };

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <Text {...uiTextProps('headline')} style={[theme.text.headline, { color: theme.colors.ink }]}>
        {t('reader.settings.translations')}
      </Text>
      {translations.length === 0 ? (
        <Text {...uiTextProps('body')} style={[theme.text.body, { color: colors.inkMuted }]}>
          {t('reader.settings.translationsEmpty')}
        </Text>
      ) : (
        translations.map((translation) => {
          const checked = selectedIds.includes(translation.id);
          const label = translation.authorName === null ? translation.name : `${translation.name} · ${translation.authorName}`;
          return (
            <Pressable
              key={translation.id}
              accessibilityLabel={label}
              accessibilityRole="switch"
              accessibilityState={{ checked }}
              onPress={() => toggle(translation.id)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: pressed ? theme.colors.fillSecondary : 'transparent',
                borderRadius: theme.radius.md,
                flexDirection: 'row',
                gap: theme.space[3],
                minHeight: 44,
                paddingHorizontal: theme.space[2],
              })}
              testID={`reader-translation-${translation.id}`}
            >
              <View style={{ flex: 1 }}>
                <Text {...uiTextProps('body')} style={[theme.text.body, { color: theme.colors.ink }]}>
                  {translation.name}
                </Text>
                {translation.authorName ? (
                  <Text {...uiTextProps('caption')} style={[theme.text.caption, { color: colors.inkMuted }]}>
                    {translation.authorName}
                  </Text>
                ) : null}
              </View>
              <View
                style={{
                  backgroundColor: checked ? theme.colors.brand : theme.colors.fillSecondary,
                  borderRadius: theme.radius.pill,
                  height: 28,
                  width: 44,
                }}
              />
            </Pressable>
          );
        })
      )}
    </View>
  );
}
