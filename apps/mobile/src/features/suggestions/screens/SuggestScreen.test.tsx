import { act, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { renderUi } from '../../../../jest/render-ui';
import { sendSuggestion } from '../api/send-suggestion';

import { SuggestScreen } from './SuggestScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
  useIsFocused: () => true,
}));

jest.mock('../api/send-suggestion', () => ({ sendSuggestion: jest.fn() }));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { ...actual, __esModule: true, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const VALID_MESSAGE = 'نص تجريبي ١ — ليس اقتراحًا';

/** Runs the card's close animation to its end, then lets the completion leave the route. */
async function settle() {
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
}

async function typeValid(view: Awaited<ReturnType<typeof renderUi>>) {
  await fireEvent.changeText(view.getByTestId('suggest-name-input'), 'أحمد');
  await fireEvent.changeText(view.getByTestId('suggest-email-input'), 'ahmad@example.com');
  await fireEvent.changeText(view.getByTestId('suggest-message-input'), VALID_MESSAGE);
}

describe('SuggestScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.mocked(useReducedMotion).mockReturnValue(false);
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the idle sheet with the intro, three fields and the send button', async () => {
    const view = await renderUi(<SuggestScreen />);

    expect(view.getByRole('header', { name: 'اقترح فكرة' })).toBeOnTheScreen();
    expect(view.getByTestId('suggest-intro')).toBeOnTheScreen();
    expect(view.getByLabelText('الاسم (اختياري)')).toBeOnTheScreen();
    expect(view.getByLabelText('البريد الإلكتروني')).toBeOnTheScreen();
    expect(view.getByLabelText('اقتراحك')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'أرسل الاقتراح' })).toBeOnTheScreen();
    expect(view.queryByTestId('suggest-status')).toBeNull();
    expect(view.queryByTestId('suggest-message-counter')).toBeNull();
  });

  it('shows the field errors and a counter, and sends nothing, when the form is invalid', async () => {
    const view = await renderUi(<SuggestScreen />);

    await fireEvent.changeText(view.getByTestId('suggest-message-input'), 'قصير');
    await fireEvent.press(view.getByRole('button', { name: 'أرسل الاقتراح' }));

    expect(view.getByTestId('suggest-email-error')).toHaveTextContent('أدخل بريدك الإلكتروني.');
    expect(view.getByTestId('suggest-message-error')).toHaveTextContent('اكتب اقتراحك (١٠ أحرف على الأقل).');
    expect(view.getByTestId('suggest-message-counter')).toHaveTextContent('٤ / ٥٠٠٠');
    expect(sendSuggestion).not.toHaveBeenCalled();
  });

  it('shows the sending state while the request is in flight', async () => {
    let finish!: (value: { kind: 'sent' }) => void;
    jest.mocked(sendSuggestion).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const view = await renderUi(<SuggestScreen />);
    await typeValid(view);

    await act(async () => {
      await fireEvent.press(view.getByRole('button', { name: 'أرسل الاقتراح' }));
    });

    expect(view.getByRole('button', { name: 'جارٍ الإرسال…' })).toHaveProp('accessibilityState', expect.objectContaining({ busy: true }));
    expect(view.getByLabelText('البريد الإلكتروني')).toHaveProp('editable', false);

    await act(async () => {
      finish({ kind: 'sent' });
    });
  });

  it('replaces the form with the sent state and a done button that closes the sheet', async () => {
    jest.mocked(sendSuggestion).mockResolvedValue({ kind: 'sent' });
    const view = await renderUi(<SuggestScreen />);
    await typeValid(view);

    await act(async () => {
      await fireEvent.press(view.getByRole('button', { name: 'أرسل الاقتراح' }));
    });

    expect(view.getByTestId('suggest-sent-title')).toBeOnTheScreen();
    expect(view.queryByLabelText('البريد الإلكتروني')).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'تم' }));
    await settle();

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('shows the offline banner, keeps the text, and offers try again', async () => {
    jest.mocked(sendSuggestion).mockResolvedValue({ kind: 'offline' });
    const view = await renderUi(<SuggestScreen />);
    await typeValid(view);

    await act(async () => {
      await fireEvent.press(view.getByRole('button', { name: 'أرسل الاقتراح' }));
    });

    expect(view.getByTestId('suggest-status')).toHaveTextContent('لا يوجد اتصال بالإنترنت. اقتراحك محفوظ هنا؛ أعد المحاولة عند الاتصال.');
    expect(view.getByRole('button', { name: 'أعد المحاولة' })).toBeOnTheScreen();
    expect(view.getByLabelText('اقتراحك')).toHaveProp('value', VALID_MESSAGE);
  });

  it('shows the limited banner', async () => {
    jest.mocked(sendSuggestion).mockResolvedValue({ kind: 'limited' });
    const view = await renderUi(<SuggestScreen />);
    await typeValid(view);

    await act(async () => {
      await fireEvent.press(view.getByRole('button', { name: 'أرسل الاقتراح' }));
    });

    expect(view.getByTestId('suggest-status')).toHaveTextContent('أرسلت اقتراحات كثيرة. حاول لاحقاً.');
  });

  it('shows the failed banner', async () => {
    jest.mocked(sendSuggestion).mockResolvedValue({ kind: 'failed' });
    const view = await renderUi(<SuggestScreen />);
    await typeValid(view);

    await act(async () => {
      await fireEvent.press(view.getByRole('button', { name: 'أرسل الاقتراح' }));
    });

    expect(view.getByTestId('suggest-status')).toHaveTextContent('تعذّر الإرسال. حاول مرة أخرى بعد قليل.');
  });

  it('closes from the X button without sending', async () => {
    const view = await renderUi(<SuggestScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'إغلاق' }));
    await settle();

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(sendSuggestion).not.toHaveBeenCalled();
  });
});
