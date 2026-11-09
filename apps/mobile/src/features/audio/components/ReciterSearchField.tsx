import { I18nManager, TextInput, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName, inputTextAlignment, uiTextProps, useContrastColors } from '@/shared/ui';

const MAGNIFIER: IconName = { ios: 'magnifyingglass', android: 'search' };

// The Listen frame's field: 46 pt, a 1 pt line border and 14 pt side padding. The shared SearchField
// (48 pt, 1.5 pt focus border, 16 pt start padding) is the Search frame's, so it is not reused here.
const FIELD_HEIGHT = 46;
const FIELD_PADDING_X = 14;

export function ReciterSearchField({
  value,
  onChangeText,
  placeholder,
  testID,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.pill,
        borderWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[2],
        minHeight: FIELD_HEIGHT,
        paddingHorizontal: FIELD_PADDING_X,
      }}
      testID={testID}
    >
      <Icon color={colors.inkMuted} name={MAGNIFIER} size={theme.size.iconMd} />
      <TextInput
        {...uiTextProps('subhead')}
        accessibilityLabel={placeholder}
        accessibilityRole="search"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        returnKeyType="search"
        // Natural alignment follows the language iOS picked at launch, which lags an in-app switch to English. Under RTL
        // natural is right already, and an explicit 'left' would leave the empty field's caret on the left.
        style={[theme.text.subhead, { color: colors.ink, flex: 1, minHeight: theme.size.touchTarget, paddingVertical: 0, ...inputTextAlignment(I18nManager.isRTL) }]}
        testID={testID ? `${testID}-input` : undefined}
        value={value}
      />
    </View>
  );
}
