import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { displayText, UiText } from '@/shared/ui';

/**
 * The user's own dua on the reading view (screens/, #MyDuaDetail). The body is shown exactly as written:
 * not trimmed, not wrapped in ornate brackets, and not set in the Quran face. It takes the reader's text size as the
 * dhikr token does, and the one-line caption sits under it.
 */
export function MyDuaBody({
  body,
  caption,
  fontScale = 1,
  testID = 'my-dua-body',
}: {
  body: string;
  caption: string;
  fontScale?: number;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[3], paddingHorizontal: theme.space[2] }} testID={testID}>
      {/* Arabic reads RTL in English too; the centre alignment stays (as in DhikrText). */}
      <UiText align="center" style={[displayText('dhikr', fontScale), { writingDirection: 'rtl' }]} variant="dhikr" weight={400}>
        {body}
      </UiText>
      <UiText align="center" numberOfLines={1} tone="muted" testID={`${testID}-caption`} variant="caption">
        {caption}
      </UiText>
    </View>
  );
}
