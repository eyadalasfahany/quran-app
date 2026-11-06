import { MESSAGE_MAX, validateSuggestion, type SuggestionValues } from './validation';

const valid: SuggestionValues = {
  name: '',
  email: 'ahmad@example.com',
  message: 'نص تجريبي ١ — ليس اقتراحًا',
};

describe('validateSuggestion', () => {
  it('accepts a complete suggestion', () => {
    expect(validateSuggestion(valid)).toEqual({});
  });

  it('asks for an email when it is empty or only spaces', () => {
    expect(validateSuggestion({ ...valid, email: '' })).toEqual({ email: 'emailRequired' });
    expect(validateSuggestion({ ...valid, email: '   ' })).toEqual({ email: 'emailRequired' });
  });

  it.each(['ahmad@example', 'ahmad.example.com', 'a b@example.com', '@example.com'])('rejects the shape of %s', (email) => {
    expect(validateSuggestion({ ...valid, email })).toEqual({ email: 'emailInvalid' });
  });

  it('counts the message after trimming, so ten characters with spaces around them are too short', () => {
    expect(validateSuggestion({ ...valid, message: '   123456789   ' })).toEqual({ message: 'messageShort' });
    expect(validateSuggestion({ ...valid, message: '1234567890' })).toEqual({});
  });

  it('rejects a message over 5000 characters', () => {
    expect(validateSuggestion({ ...valid, message: 'a'.repeat(MESSAGE_MAX) })).toEqual({});
    expect(validateSuggestion({ ...valid, message: 'a'.repeat(MESSAGE_MAX + 1) })).toEqual({ message: 'messageLong' });
  });

  it('rejects a name over 100 characters and accepts 100', () => {
    expect(validateSuggestion({ ...valid, name: 'a'.repeat(100) })).toEqual({});
    expect(validateSuggestion({ ...valid, name: 'a'.repeat(101) })).toEqual({ name: 'nameLong' });
  });

  it('reports every field that is wrong at once', () => {
    expect(validateSuggestion({ name: 'a'.repeat(101), email: '', message: 'short' })).toEqual({
      email: 'emailRequired',
      message: 'messageShort',
      name: 'nameLong',
    });
  });
});
