import type { paths } from '@quran/api-contract';

import { apiPost, isNetworkError } from '@/core/api';
import type { Locale } from '@/core/i18n';

// Typed against the generated contract, so a renamed path fails tsc.
const SUGGESTIONS_PATH = '/suggestions' satisfies keyof paths;

export type SuggestionDraft = {
  /** Optional. An empty name is left out of the request. */
  name?: string;
  email: string;
  message: string;
  /** The app's current language: the page the auto-reply is written in (ADR 0066). */
  locale: Locale;
};

/** What the server said. `invalid` carries the first message for each field the server rejected. */
export type SendResult =
  | { kind: 'sent' }
  | { kind: 'invalid'; errors: Record<string, string> }
  | { kind: 'limited' }
  | { kind: 'offline' }
  | { kind: 'failed' };

export async function sendSuggestion(draft: SuggestionDraft): Promise<SendResult> {
  const name = draft.name?.trim() ?? '';
  const body = {
    ...(name.length > 0 ? { name } : {}),
    email: draft.email,
    message: draft.message,
    locale: draft.locale,
    source: 'app',
    // The honeypot. A real app never fills it, so it is always sent empty.
    website: '',
  };

  let response: Response;
  try {
    response = await apiPost(SUGGESTIONS_PATH, body);
  } catch (error) {
    return isNetworkError(error) ? { kind: 'offline' } : { kind: 'failed' };
  }

  if (response.status === 202) {
    return { kind: 'sent' };
  }
  if (response.status === 429) {
    return { kind: 'limited' };
  }
  if (response.status === 422) {
    const errors = await firstErrorPerField(response);
    return errors === null ? { kind: 'failed' } : { kind: 'invalid', errors };
  }
  return { kind: 'failed' };
}

/** The 422 body is `{ errors: { field: string[] } }`. Keeps the first message for each field. */
async function firstErrorPerField(response: Response): Promise<Record<string, string> | null> {
  try {
    const parsed: unknown = await response.json();
    if (typeof parsed !== 'object' || parsed === null || !('errors' in parsed)) {
      return null;
    }
    const { errors } = parsed;
    if (typeof errors !== 'object' || errors === null) {
      return null;
    }
    const first: Record<string, string> = {};
    for (const [field, messages] of Object.entries(errors)) {
      if (Array.isArray(messages) && typeof messages[0] === 'string') {
        first[field] = messages[0];
      }
    }
    return first;
  } catch {
    return null;
  }
}
