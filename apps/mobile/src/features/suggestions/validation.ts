export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 5000;
export const NAME_MAX = 100;

export type SuggestionField = 'name' | 'email' | 'message';

export type SuggestionValues = Record<SuggestionField, string>;

/** Keys under `suggest.errors` in the locale files. */
export type ClientErrorKey = 'emailRequired' | 'emailInvalid' | 'messageShort' | 'messageLong' | 'nameLong';

// One «@», no spaces, and a dot in the domain. The server checks the address properly; this only catches typos early.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Checks what the form can check before it sends. Lengths count the trimmed text, as the server does. A field
 * that is fine has no entry.
 */
export function validateSuggestion(values: SuggestionValues): Partial<Record<SuggestionField, ClientErrorKey>> {
  const errors: Partial<Record<SuggestionField, ClientErrorKey>> = {};

  const email = values.email.trim();
  if (email.length === 0) {
    errors.email = 'emailRequired';
  } else if (!EMAIL_SHAPE.test(email)) {
    errors.email = 'emailInvalid';
  }

  const message = values.message.trim();
  if (message.length < MESSAGE_MIN) {
    errors.message = 'messageShort';
  } else if (message.length > MESSAGE_MAX) {
    errors.message = 'messageLong';
  }

  if (values.name.trim().length > NAME_MAX) {
    errors.name = 'nameLong';
  }

  return errors;
}
