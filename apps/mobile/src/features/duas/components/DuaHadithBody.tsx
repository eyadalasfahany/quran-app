import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { displayText, UiText } from '@/shared/ui';

/**
 * Prophetic dua text and attribution (screens/, #DuaHadithDetail). The text takes the reader's text size
 * the way `DhikrText` does. No audio (ADR 0055 §3).
 */
export function DuaHadithBody({
  text,
  attribution,
  fontScale = 1,
  testID = 'dua-hadith-body',
}: {
  text: string;
  attribution: string;
  fontScale?: number;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[4], paddingHorizontal: theme.space[2] }} testID={testID}>
      {/* Arabic reads RTL in English too; the centre alignment stays (as in DhikrText). */}
      <UiText align="center" style={[displayText('dhikr', fontScale), { writingDirection: 'rtl' }]} variant="dhikr" weight={400}>
        {text}
      </UiText>
      {attribution.trim().length > 0 ? (
        <UiText align="center" tone="muted" variant="caption">
          {attribution}
        </UiText>
      ) : null}
    </View>
  );
}
