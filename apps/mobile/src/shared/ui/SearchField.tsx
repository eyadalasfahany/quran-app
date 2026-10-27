import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { uiTextProps } from './textStyles';
import { useContrastColors } from './useContrastColors';

const MAGNIFIER = { ios: 'magnifyingglass', android: 'search' } as const;
const CLEAR = { ios: 'xmark.circle.fill', android: 'cancel' } as const;

export function SearchField({
  value,
  onChangeText,
  placeholder,
  onSubmit,
  autoFocus = false,
  testID,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  onSubmit: (text: string) => void;
  autoFocus?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: focused ? theme.colors.brand : colors.line,
        borderRadius: theme.radius.pill,
        borderWidth: theme.stroke.focus,
        flexDirection: 'row',
        gap: theme.space[2],
        minHeight: 48,
        paddingStart: theme.space[4],
        paddingEnd: value ? theme.space[1] : theme.space[4],
      }}
      testID={testID}
    >
      <Icon color={colors.inkMuted} name={MAGNIFIER} size={theme.size.iconMd} />
      <TextInput
        {...uiTextProps('body')}
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        enterKeyHint="search"
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onSubmitEditing={() => onSubmit(value)}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        returnKeyType="search"
        style={[
          theme.text.body,
          { color: colors.ink, flex: 1, minHeight: theme.size.touchTarget, paddingVertical: 0 },
        ]}
        testID={testID ? `${testID}-input` : undefined}
        value={value}
      />
      {value ? (
        <IconButton
          icon={CLEAR}
          label={t('ui.clearSearch')}
          onPress={() => onChangeText('')}
          testID={testID ? `${testID}-clear` : undefined}
        />
      ) : null}
    </View>
  );
}
