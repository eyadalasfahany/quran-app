import { useState } from "react";
import { TextInput, View } from "react-native";

import { useLocale } from "@/core/i18n";
import { useTheme } from "@/core/theme";
import { uiFontFamilies } from "@/core/theme/fonts";
import { UiText, uiTextProps, useContrastColors } from "@/shared/ui";

export type SuggestFieldKind = "text" | "email" | "multiline";

// The frame's measures: a 52 pt single line and a 150 pt message box; 17 pt text on 24 (single) or 28 (multiline).
const LINE_MIN_HEIGHT = 52;
const MESSAGE_HEIGHT = 150;
const LINE_HEIGHT = 24;
const MESSAGE_LINE_HEIGHT = 28;
const FIELD_PADDING_X = 14;
const FIELD_PADDING_Y = 12;
const TEXT_SIZE = 17;
const CAPTION_LINE_HEIGHT = 19;

/**
 * One labelled field of the suggestion sheet (quran-app-screens.html, #SuggestSheet): a caption, the box, an error line
 * under it, and a footer with a hint at the start edge and a counter at the end. An invalid field draws a danger border.
 * An email field is Latin text: it reads left to right and is never capitalised or auto-corrected.
 */
export function SuggestField({
  label,
  value,
  onChangeText,
  placeholder,
  kind = "text",
  error,
  hint,
  counter,
  editable = true,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  kind?: SuggestFieldKind;
  /** The error line under the box. Its presence draws the danger border. */
  error?: string;
  /** Helper text in the footer, at the start edge. */
  hint?: string;
  /** Counter text in the footer, at the end edge. */
  counter?: string;
  editable?: boolean;
  testID: string;
}) {
  const theme = useTheme();
  const locale = useLocale();
  const colors = useContrastColors();
  const [focused, setFocused] = useState(false);
  const invalid = error !== undefined;
  const multiline = kind === "multiline";
  const email = kind === "email";
  const showFooter = hint !== undefined || counter !== undefined;

  return (
    <View style={{ gap: theme.space[1] + 2 }} testID={testID}>
      <UiText
        style={{ marginHorizontal: theme.space[1] }}
        tone="muted"
        variant="subhead"
        weight={600}
      >
        {label}
      </UiText>
      <TextInput
        {...uiTextProps("body")}
        accessibilityHint={error ?? hint}
        accessibilityLabel={label}
        aria-invalid={invalid}
        autoCapitalize={email ? "none" : "sentences"}
        autoComplete={email ? "email" : "off"}
        autoCorrect={!email}
        editable={editable}
        keyboardType={email ? "email-address" : "default"}
        multiline={multiline}
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        style={[
          {
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: invalid
              ? theme.colors.danger
              : focused
                ? theme.colors.brand
                : colors.line,
            borderRadius: theme.radius.lg,
            borderWidth:
              invalid || focused ? theme.stroke.focus : theme.stroke.hairline,
            color: colors.ink,
            fontFamily: uiFontFamilies[400],
            fontSize: TEXT_SIZE,
            height: multiline ? MESSAGE_HEIGHT : undefined,
            lineHeight: multiline ? MESSAGE_LINE_HEIGHT : LINE_HEIGHT,
            minHeight: multiline ? undefined : LINE_MIN_HEIGHT,
            opacity: editable ? 1 : 0.6,
            paddingHorizontal: FIELD_PADDING_X,
            paddingVertical: multiline ? FIELD_PADDING_Y : 0,
            // The address reads left to right but sits on the field's end side, as in the SuggestSheet frame (right in Arabic).
            ...(email
              ? {
                  direction: "ltr" as const,
                  writingDirection: "ltr" as const,
                  textAlign:
                    locale === "ar" ? ("right" as const) : ("left" as const),
                }
              : null),
          },
        ]}
        testID={`${testID}-input`}
        textAlignVertical={multiline ? "top" : "center"}
        value={value}
      />
      {error !== undefined ? (
        <UiText
          style={{
            lineHeight: CAPTION_LINE_HEIGHT,
            marginHorizontal: theme.space[1],
          }}
          testID={`${testID}-error`}
          tone="danger"
          variant="caption"
        >
          {error}
        </UiText>
      ) : null}
      {showFooter ? (
        <View
          style={{
            flexDirection: "row",
            gap: theme.space[2],
            justifyContent: "space-between",
            marginHorizontal: theme.space[1],
          }}
          testID={`${testID}-footer`}
        >
          {hint !== undefined ? (
            <UiText
              style={{ flexShrink: 1, lineHeight: CAPTION_LINE_HEIGHT }}
              tone="muted"
              variant="caption"
            >
              {hint}
            </UiText>
          ) : null}
          {counter !== undefined ? (
            <UiText
              style={{ lineHeight: CAPTION_LINE_HEIGHT }}
              testID={`${testID}-counter`}
              tone="muted"
              variant="caption"
            >
              {counter}
            </UiText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
