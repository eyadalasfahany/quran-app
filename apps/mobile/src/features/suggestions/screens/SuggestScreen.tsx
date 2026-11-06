import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { SheetFrame } from '@/features/reader/components/SheetFrame';
import { SheetHost } from '@/features/reader/components/SheetHost';
import { SheetScrollView } from '@/features/reader/components/SheetScrollView';
import { useSheet } from '@/features/reader/components/sheet-context';

import { SuggestField } from '../components/SuggestField';
import { SuggestIntro } from '../components/SuggestIntro';
import { SuggestSentState } from '../components/SuggestSentState';
import { SuggestSheetHeader } from '../components/SuggestSheetHeader';
import { SuggestStatusBanner, type SuggestStatusKind } from '../components/SuggestStatusBanner';
import { SuggestSubmitButton } from '../components/SuggestSubmitButton';
import { useSuggestionForm } from '../hooks/useSuggestionForm';
import { MESSAGE_MAX } from '../validation';

// The frame's spacing: 14 between the sheet's blocks, 20 at the sides, 24 at the bottom.
const BLOCK_GAP = 14;
const SIDE_PADDING = 20;
const BOTTOM_PADDING = 24;

/** «اقترح فكرة» as a full-height sheet (`/settings/suggest`, quran-app-screens.html, #SuggestSheet). */
export function SuggestScreen() {
  return (
    <SheetHost initialDetent="full" testID="suggest-sheet">
      <SuggestCard />
    </SheetHost>
  );
}

function SuggestCard() {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const sheet = useSheet();
  const { values, setField, errors, status, submit } = useSuggestionForm();

  const sent = status === 'sent';
  const sending = status === 'sending';
  const hasErrors = Object.keys(errors).length > 0;
  const bannerKind = status === 'offline' || status === 'limited' || status === 'failed' ? (status satisfies SuggestStatusKind) : null;
  const counter = hasErrors
    ? t('suggest.counter', { count: formatNumber(values.message.trim().length, locale), max: formatNumber(MESSAGE_MAX, locale) })
    : undefined;

  const close = () => {
    sheet?.close();
  };

  return (
    <SheetFrame grabber="compact" shape="full" testID="suggest-frame">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            gap: BLOCK_GAP,
            paddingBottom: Math.max(insets.bottom, BOTTOM_PADDING),
            paddingHorizontal: SIDE_PADDING,
            paddingTop: BLOCK_GAP,
          }}
        >
          <SuggestSheetHeader closeLabel={t('suggest.close')} onClose={close} title={t('suggest.title')} />
          {sent ? (
            <SuggestSentState />
          ) : (
            <>
              <SuggestIntro text={t('suggest.intro')} />
              <SheetScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ gap: BLOCK_GAP }}>
                <SuggestField
                  editable={!sending}
                  label={t('suggest.nameLabel')}
                  onChangeText={(text) => setField('name', text)}
                  placeholder={t('suggest.namePlaceholder')}
                  testID="suggest-name"
                  value={values.name}
                  error={errors.name}
                />
                <SuggestField
                  editable={!sending}
                  error={errors.email}
                  kind="email"
                  label={t('suggest.emailLabel')}
                  onChangeText={(text) => setField('email', text)}
                  placeholder={t('suggest.emailPlaceholder')}
                  testID="suggest-email"
                  value={values.email}
                />
                <SuggestField
                  counter={counter}
                  editable={!sending}
                  error={errors.message}
                  hint={t('suggest.helper')}
                  kind="multiline"
                  label={t('suggest.messageLabel')}
                  onChangeText={(text) => setField('message', text)}
                  placeholder={t('suggest.messagePlaceholder')}
                  testID="suggest-message"
                  value={values.message}
                />
              </SheetScrollView>
            </>
          )}
          <View style={{ gap: theme.space[3] }}>
            {bannerKind === null ? null : <SuggestStatusBanner kind={bannerKind} />}
            {sent ? (
              <SuggestSubmitButton label={t('suggest.done')} onPress={close} />
            ) : (
              <SuggestSubmitButton
                busy={sending}
                label={sending ? t('suggest.sending') : bannerKind === null ? t('suggest.send') : t('suggest.retry')}
                onPress={() => {
                  void submit();
                }}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SheetFrame>
  );
}
