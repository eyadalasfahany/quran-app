import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

export function NameSourceBlock({
  sourceLabel,
  note,
  testID = 'name-source-block',
}: {
  sourceLabel: string;
  note: string | null;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <UiText variant="title">{t('names.detail.sourceHeading')}</UiText>
      <UiText tone="muted" variant="body">
        {sourceLabel}
      </UiText>
      {note ? (
        <UiText tone="muted" variant="caption">
          {note}
        </UiText>
      ) : null}
    </View>
  );
}
