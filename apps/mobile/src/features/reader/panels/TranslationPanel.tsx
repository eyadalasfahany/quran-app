import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { useTheme } from '@/core/theme';
import { Card, EmptyState, ToggleRow, UiText } from '@/shared/ui';

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

  return (
    <ScrollView contentContainerStyle={{ gap: theme.space[4], paddingBottom: theme.space[6] }} testID={testID}>
      <ToggleRow
        onValueChange={onShowInlineChange}
        testID={`${testID}-inline`}
        title={t('reader.translationPanel.showInline')}
        value={showInline}
      />
      {translations.length === 0 ? (
        <EmptyState
          body={t('reader.translationPanel.emptyBody')}
          icon={EMPTY_ICON}
          testID={`${testID}-empty`}
          title={t('reader.translationPanel.emptyTitle')}
        />
      ) : (
        translations.map(({ meta, text }) => (
          <Card key={meta.resourceId} style={{ gap: theme.space[2] }} testID={`${testID}-item-${meta.resourceId}`}>
            <UiText variant="headline">{meta.name}</UiText>
            {text === null ? (
              <UiText tone="muted">{t('reader.translationPanel.missing')}</UiText>
            ) : (
              <UiText
                align={meta.direction === 'rtl' ? 'right' : 'left'}
                style={{ writingDirection: meta.direction }}
                testID={`${testID}-text-${meta.resourceId}`}
              >
                {text}
              </UiText>
            )}
            <UiText testID={`${testID}-source-${meta.resourceId}`} tone="muted" variant="caption">
              {meta.authorName === null
                ? t('reader.translationAttribution', { name: meta.name })
                : t('reader.translationAttributionWithAuthor', { author: meta.authorName, name: meta.name })}
            </UiText>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
