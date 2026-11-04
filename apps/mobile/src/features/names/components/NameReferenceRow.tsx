import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { QuranText, UiText } from '@/shared/ui';

import type { NameReference } from '../data/model';

export function NameReferenceRow({
  reference,
  onPress,
  testID = 'name-reference-row',
}: {
  reference: NameReference;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (!reference.verseTextUthmani) {
    return null;
  }

  return (
    <Pressable
      accessibilityLabel={t('names.detail.openVerse', { verseKey: reference.verseKey })}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: theme.colors.line,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        gap: theme.space[2],
        padding: theme.space[4],
      }}
      testID={testID}
    >
      <UiText tone="muted" variant="caption">
        {reference.verseKey}
      </UiText>
      <QuranText variant="quranResult">{reference.verseTextUthmani}</QuranText>
    </Pressable>
  );
}
