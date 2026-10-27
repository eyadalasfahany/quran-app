import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ToggleRow, UiText } from '@/shared/ui';

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

  const toggle = (id: number, on: boolean) => {
    const without = selectedIds.filter((selected) => selected !== id);
    onChange(on ? [...without, id] : without);
  };

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <UiText variant="headline">{t('reader.settings.translations')}</UiText>
      {translations.length === 0 ? (
        <UiText tone="muted">{t('reader.settings.translationsEmpty')}</UiText>
      ) : (
        translations.map((translation) => (
          <ToggleRow
            key={translation.id}
            onValueChange={(on) => toggle(translation.id, on)}
            subtitle={translation.authorName ?? undefined}
            testID={`reader-translation-${translation.id}`}
            title={translation.name}
            value={selectedIds.includes(translation.id)}
          />
        ))
      )}
    </View>
  );
}
