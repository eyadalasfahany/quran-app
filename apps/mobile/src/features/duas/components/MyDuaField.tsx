import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { arabicTextDirection, displayText, uiTextProps, UiText, useContrastColors } from '@/shared/ui';

// The body field grows from 150 to 240 and scrolls inside itself past that (quran-app-screens.html, #MyDuaEditor).
const BODY_MIN_HEIGHT = 150;
const BODY_MAX_HEIGHT = 240;

/** One labelled field of «أدعيتي»: a caption above a text input in the Quran-style Arabic face. */
export function MyDuaField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  testID: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <UiText tone="muted" variant="caption" weight={600}>
        {label}
      </UiText>
      <TextInput
        {...uiTextProps('body')}
        accessibilityLabel={label}
        multiline={multiline}
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        style={[
          displayText('dhikrList'),
          arabicTextDirection,
          {
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: focused ? theme.colors.brand : colors.line,
            borderRadius: theme.radius.lg,
            borderWidth: theme.stroke.focus,
            color: colors.ink,
            maxHeight: multiline ? BODY_MAX_HEIGHT : undefined,
            minHeight: multiline ? BODY_MIN_HEIGHT : theme.size.touchTarget,
            paddingHorizontal: theme.space[4],
            paddingVertical: theme.space[3],
          },
        ]}
        testID={`${testID}-input`}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
    </View>
  );
}
