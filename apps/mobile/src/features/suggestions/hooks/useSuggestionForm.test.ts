import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { i18n } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { sendSuggestion, type SendResult } from '../api/send-suggestion';

import { useSuggestionForm } from './useSuggestionForm';

jest.mock('../api/send-suggestion', () => ({ sendSuggestion: jest.fn() }));

const VALID_MESSAGE = 'نص تجريبي ١ — ليس اقتراحًا';

type FormResult = { current: ReturnType<typeof useSuggestionForm> };

async function fill(result: FormResult, overrides: Partial<{ name: string; email: string; message: string }> = {}) {
  await act(async () => {
    result.current.setField('name', overrides.name ?? 'أحمد');
    result.current.setField('email', overrides.email ?? 'ahmad@example.com');
    result.current.setField('message', overrides.message ?? VALID_MESSAGE);
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('useSuggestionForm', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    storage.set(storageKeys.locale, 'ar');
    await i18n.changeLanguage('ar');
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  });

  it('starts empty and idle', async () => {
    const { result } = await renderHook(() => useSuggestionForm());

    expect(result.current.values).toEqual({ name: '', email: '', message: '' });
    expect(result.current.status).toBe('idle');
    expect(result.current.errors).toEqual({});
  });

  it('shows client errors and sends nothing when the form is invalid', async () => {
    const { result } = await renderHook(() => useSuggestionForm());

    await act(async () => {
      await result.current.submit();
    });

    expect(sendSuggestion).not.toHaveBeenCalled();
    expect(result.current.errors).toEqual({
      email: 'أدخل بريدك الإلكتروني.',
      message: 'اكتب اقتراحك (١٠ أحرف على الأقل).',
    });
    expect(result.current.status).toBe('idle');
  });

  it('clears a field error when that field changes', async () => {
    const { result } = await renderHook(() => useSuggestionForm());
    await act(async () => {
      await result.current.submit();
    });

    await act(async () => {
      result.current.setField('email', 'a');
    });

    expect(result.current.errors.email).toBeUndefined();
    expect(result.current.errors.message).toBeDefined();
  });

  it('sends the trimmed values with the app locale and reports sent', async () => {
    jest.mocked(sendSuggestion).mockResolvedValue({ kind: 'sent' });
    const { result } = await renderHook(() => useSuggestionForm());
    await fill(result, { email: '  ahmad@example.com  ', message: `  ${VALID_MESSAGE}  ` });

    await act(async () => {
      await result.current.submit();
    });

    expect(sendSuggestion).toHaveBeenCalledWith({
      name: 'أحمد',
      email: 'ahmad@example.com',
      message: VALID_MESSAGE,
      locale: 'ar',
    });
    expect(result.current.status).toBe('sent');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('شكراً لك على اقتراحك');
  });

  it.each([
    ['offline', 'offline'],
    ['limited', 'limited'],
    ['failed', 'failed'],
  ] as const)('keeps the typed text when the result is %s', async (kind, status) => {
    jest.mocked(sendSuggestion).mockResolvedValue({ kind } as SendResult);
    const { result } = await renderHook(() => useSuggestionForm());
    await fill(result);

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.status).toBe(status);
    expect(result.current.values).toEqual({ name: 'أحمد', email: 'ahmad@example.com', message: VALID_MESSAGE });
  });

  it('puts the server message for each rejected field back on the form and returns to idle', async () => {
    jest.mocked(sendSuggestion).mockResolvedValue({
      kind: 'invalid',
      errors: { email: 'Server says no to this address.', unknown: 'ignored' },
    });
    const { result } = await renderHook(() => useSuggestionForm());
    await fill(result);

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.errors).toEqual({ email: 'Server says no to this address.' });
    expect(result.current.status).toBe('idle');
    expect(result.current.values.message).toBe(VALID_MESSAGE);
  });

  it('ignores a second submit while one is still sending', async () => {
    const pending = deferred<SendResult>();
    jest.mocked(sendSuggestion).mockReturnValue(pending.promise);
    const { result } = await renderHook(() => useSuggestionForm());
    await fill(result);

    let first!: Promise<void>;
    await act(async () => {
      first = result.current.submit();
    });
    expect(result.current.status).toBe('sending');

    await act(async () => {
      await result.current.submit();
    });
    expect(sendSuggestion).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({ kind: 'sent' });
      await first;
    });
    expect(result.current.status).toBe('sent');
  });
});
