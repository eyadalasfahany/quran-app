import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Divider, UiText } from '@/shared/ui';

/**
 * The meaning and the benefits of a prophetic dua (screens/, #DuaHadithDetailNoSource). A hairline sits above the block
 * and between the two sections. An empty field is left out, with its heading. Renders nothing when both are empty.
 */
export function DuaHadithNotes({
  explanation,
  hints,
  testID = 'dua-hadith-notes',
}: {
  explanation: string | null;
  hints: string | null;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  const sections = [
    { key: 'explanation', title: t('duas.hadith.explanation'), body: explanation },
    { key: 'hints', title: t('duas.hadith.hints'), body: hints },
  ].flatMap((section) => (section.body === null || section.body.trim().length === 0 ? [] : [{ ...section, body: section.body }]));

  if (sections.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: theme.space[3], paddingHorizontal: theme.space[2] }} testID={testID}>
      <Divider testID="dua-notes-divider" />
      {sections.map((section, index) => (
        <View key={section.key} style={{ gap: theme.space[2] }}>
          {index > 0 ? <Divider testID="dua-notes-divider" /> : null}
          <UiText tone="muted" variant="caption" weight={600}>
            {section.title}
          </UiText>
          <UiText variant="body">{section.body}</UiText>
        </View>
      ))}
    </View>
  );
}
