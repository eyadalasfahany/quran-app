import { useCallback, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useLocale } from '@/core/i18n';

import { sendSuggestion } from '../api/send-suggestion';
import { validateSuggestion, type SuggestionField, type SuggestionValues } from '../validation';

export type SuggestionStatus = 'idle' | 'sending' | 'sent' | 'offline' | 'limited' | 'failed';

/** The text shown under each field: a client message, or the first message the server sent for it. */
export type SuggestionFieldErrors = Partial<Record<SuggestionField, string>>;

const EMPTY_VALUES: SuggestionValues = { name: '', email: '', message: '' };

/**
 * The suggestion form's state. The text is never cleared on a failure, so the visitor can try again. A second submit
 * while one is sending does nothing. Each outcome is announced to screen readers once.
 */
export function useSuggestionForm() {
  const { t } = useTranslation();
  const locale = useLocale();
  const [values, setValues] = useState<SuggestionValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<SuggestionFieldErrors>({});
  const [status, setStatus] = useState<SuggestionStatus>('idle');
  // State is applied after the render, so a fast second press would still see 'idle'. The ref closes that gap.
  const sendingRef = useRef(false);

  const setField = useCallback((field: SuggestionField, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => {
      if (previous[field] === undefined) {
        return previous;
      }
      const { [field]: _cleared, ...rest } = previous;
      return rest;
    });
  }, []);

  const submit = useCallback(async () => {
    if (sendingRef.current) {
      return;
    }

    const clientErrors = validateSuggestion(values);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(
        Object.fromEntries(
          Object.entries(clientErrors).map(([field, key]) => [field, t(`suggest.errors.${key}`)]),
        ) as SuggestionFieldErrors,
      );
      return;
    }

    sendingRef.current = true;
    setErrors({});
    setStatus('sending');
    try {
      const result = await sendSuggestion({
        name: values.name.trim(),
        email: values.email.trim(),
        message: values.message.trim(),
        locale,
      });

      if (result.kind === 'invalid') {
        setErrors(keepKnownFields(result.errors));
        setStatus('idle');
        return;
      }
      setStatus(result.kind === 'sent' ? 'sent' : result.kind);
      if (result.kind === 'sent') {
        AccessibilityInfo.announceForAccessibility(t('suggest.sentTitle'));
      } else {
        AccessibilityInfo.announceForAccessibility(t(`suggest.${result.kind}`));
      }
    } finally {
      sendingRef.current = false;
    }
  }, [locale, t, values]);

  return { values, setField, errors, status, submit };
}

function keepKnownFields(errors: Record<string, string>): SuggestionFieldErrors {
  const known: SuggestionFieldErrors = {};
  for (const field of ['name', 'email', 'message'] as const) {
    const message = errors[field];
    if (message !== undefined) {
      known[field] = message;
    }
  }
  return known;
}
