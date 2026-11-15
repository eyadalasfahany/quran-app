import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, arabicTextDirection } from '@/shared/ui';

import type { SeerahParagraph } from '../types';

/**
 * The book's paragraphs, in order, exactly as stored: nothing is trimmed, normalised or reflowed (Non-negotiable 1 applies
 * to the book as it does to the Quran). Amiri 21 on a 1.95 line, justified, right to left in both languages.
 */
export function EventText({ paragraphs, testID = 'seerah-event-text' }: { paragraphs: readonly SeerahParagraph[]; testID?: string }) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[4] }} testID={testID}>
      {paragraphs.map((paragraph) => (
        <UiText
          key={paragraph.id}
          style={[arabicTextDirection, { fontSize: 21, lineHeight: 41, textAlign: 'justify' }]}
          testID={`${testID}-${paragraph.id}`}
          variant="dhikr"
        >
          {paragraph.text}
        </UiText>
      ))}
    </View>
  );
}
