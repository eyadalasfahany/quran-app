import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from 'react-native';

import { useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { Button, UiText, uiTextProps, useContrastColors } from '@/shared/ui';

import { parseSibhaNumber, SIBHA_MAX } from '../data/model';

/** Keeps only digits, turning Arabic-Indic digits into Western ones, so the field reads the same in both languages. */
function digitsOnly(text: string): string {
  return text.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660)).replace(/\D/g, '').slice(0, String(SIBHA_MAX).length);
}

/**
 * The custom target sheet (screens/, #Sibha «مخصص»): a number field with save and cancel, over a dimmed
 * screen. A plain RN Modal, like the Salah location sheet. Save stays off until the number is valid.
 */
export function SibhaCustomTargetSheet({
  visible,
  initialValue,
  onSave,
  onClose,
  testID = 'sibha-custom-sheet',
}: {
  visible: boolean;
  initialValue: number | null;
  onSave: (value: number) => void;
  onClose: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const colors = useContrastColors();
  const initialText = initialValue === null ? '' : String(initialValue);
  const [text, setText] = useState(initialText);
  // Each opening starts from the current custom target, not from the last edit. The reset happens while rendering
  // (React's pattern for state that follows a prop), not in an effect.
  const [opened, setOpened] = useState({ initialText, visible });
  if (opened.visible !== visible || opened.initialText !== initialText) {
    setOpened({ initialText, visible });
    if (visible) {
      setText(initialText);
    }
  }

  const value = parseSibhaNumber(text);
  const display = locale === 'ar' ? text.replace(/\d/g, (digit) => String.fromCharCode(0x0660 + Number(digit))) : text;

  return (
    <Modal animationType="fade" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      {/* The card rises with the keyboard, so the number field stays in view on a short window (ADR 0036). */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        testID={`${testID}-keyboard`}
      >
      <View style={{ flex: 1, justifyContent: 'center', padding: theme.space[5] }} testID={testID}>
        <Pressable
          accessibilityLabel={t('sibha.close')}
          accessibilityRole="button"
          onPress={onClose}
          style={{ backgroundColor: 'transparent', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }}
          testID={`${testID}-scrim`}
        />
        <View
          style={{
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: colors.line,
            borderRadius: theme.radius.xl,
            borderWidth: theme.stroke.hairline,
            gap: theme.space[4],
            padding: theme.space[5],
          }}
        >
          <UiText accessibilityRole="header" variant="headline">
            {t('sibha.customTitle')}
          </UiText>
          <UiText tone="muted" variant="subhead">
            {t('sibha.customBody')}
          </UiText>
          <TextInput
            {...uiTextProps('headline')}
            accessibilityLabel={t('sibha.customField')}
            keyboardType="number-pad"
            maxLength={String(SIBHA_MAX).length}
            onChangeText={(next) => setText(digitsOnly(next))}
            placeholder={t('sibha.customField')}
            placeholderTextColor={colors.inkMuted}
            style={{
              borderColor: colors.line,
              borderRadius: theme.radius.card,
              borderWidth: theme.stroke.hairline,
              color: theme.colors.ink,
              minHeight: theme.size.touchTarget,
              paddingHorizontal: theme.space[4],
              textAlign: 'center',
            }}
            testID={`${testID}-input`}
            value={display}
          />
          <Button
            disabled={value === null}
            label={t('sibha.customSave')}
            onPress={() => {
              if (value !== null) {
                onSave(value);
              }
            }}
            stretch
            testID={`${testID}-save`}
            variant="primary"
          />
          <Button label={t('common.cancel')} onPress={onClose} stretch testID={`${testID}-cancel`} variant="ghost" />
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
