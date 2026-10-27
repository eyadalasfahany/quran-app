import { useTranslation } from 'react-i18next';
import { ScrollView, Switch, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { EmptyState, uiTextProps } from '@/shared/ui';
import { useContrastColors } from '@/shared/ui/useContrastColors';

import type { TranslationResourceMeta } from '../reading-list-types';

const EMPTY_ICON = { ios: 'character.book.closed', android: 'translate' } as const;

export type AyahTranslation = {
  meta: TranslationResourceMeta;
  // As received; null when the pack has no row for this ayah.
  text: string | null;
};

export function TranslationPanel({
  translations,
  showInline,
  onShowInlineChange,
  testID = 'translation-panel',
}: {
  // The reader's selected translations, in their chosen order.
  translations: readonly AyahTranslation[];
  // Reading mode shows translations under each ayah (reader settings).
  showInline: boolean;
  onShowInlineChange: (value: boolean) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <ScrollView contentContainerStyle={{ gap: theme.space[4], paddingBottom: theme.space[6] }} testID={testID}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: theme.space[3],
          minHeight: 44,
        }}
      >
        <Text {...uiTextProps('body')} style={[theme.text.body, { color: theme.colors.ink, flex: 1 }]}>
          {t('reader.translationPanel.showInline')}
        </Text>
        <Switch
          accessibilityLabel={t('reader.translationPanel.showInline')}
          accessibilityRole="switch"
          accessibilityState={{ checked: showInline }}
          ios_backgroundColor={theme.colors.fillSecondary}
          onValueChange={onShowInlineChange}
          testID={`${testID}-inline`}
          thumbColor={theme.colors.surfaceRaised}
          trackColor={{ false: theme.colors.fillSecondary, true: theme.colors.brand }}
          value={showInline}
        />
      </View>
      {translations.length === 0 ? (
        <EmptyState
          body={t('reader.translationPanel.emptyBody')}
          icon={EMPTY_ICON}
          testID={`${testID}-empty`}
          title={t('reader.translationPanel.emptyTitle')}
        />
      ) : (
        translations.map(({ meta, text }) => {
          const align = meta.direction === 'rtl' ? 'right' : 'left';
          return (
            <View
              key={meta.resourceId}
              style={{
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: colors.line,
                borderRadius: theme.radius.lg,
                borderWidth: 1,
                gap: theme.space[2],
                padding: theme.space[4],
              }}
              testID={`${testID}-item-${meta.resourceId}`}
            >
              <Text {...uiTextProps('headline')} style={[theme.text.headline, { color: theme.colors.ink }]}>
                {meta.name}
              </Text>
              {text === null ? (
                <Text {...uiTextProps('body')} style={[theme.text.body, { color: colors.inkMuted }]}>
                  {t('reader.translationPanel.missing')}
                </Text>
              ) : (
                <Text
                  {...uiTextProps('body')}
                  style={[theme.text.body, { color: theme.colors.ink, textAlign: align, writingDirection: meta.direction }]}
                  testID={`${testID}-text-${meta.resourceId}`}
                >
                  {text}
                </Text>
              )}
              <Text {...uiTextProps('caption')} style={[theme.text.caption, { color: colors.inkMuted }]} testID={`${testID}-source-${meta.resourceId}`}>
                {meta.authorName === null
                  ? t('reader.translationAttribution', { name: meta.name })
                  : t('reader.translationAttributionWithAuthor', { author: meta.authorName, name: meta.name })}
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
