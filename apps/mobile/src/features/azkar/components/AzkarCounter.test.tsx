import { fireEvent, screen } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarCounter, COUNTER_SIZE, COUNTER_SIZE_COMPACT } from './AzkarCounter';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const mockReduce = useReducedMotion as unknown as jest.Mock;

function renderCounter(props: Partial<Parameters<typeof AzkarCounter>[0]> = {}, locale: 'ar' | 'en' = 'ar') {
  const handlers = { onTap: jest.fn(), onReset: jest.fn() };
  const ui = <AzkarCounter position={2} requiredCount={3} value={2} {...handlers} {...props} />;
  return { handlers, ui, locale };
}

describe('AzkarCounter', () => {
  beforeEach(() => mockReduce.mockReturnValue(false));

  describe('a sourced count above 1', () => {
    it('is a 120 pt button labelled with its position and valued with «٢ من ٣»', async () => {
      const { ui } = renderCounter();
      await renderUi(ui);
      const counter = screen.getByRole('button', { name: 'عداد الذكر ٢' });
      expect(counter.props.accessibilityValue).toEqual({ text: '٢ من ٣' });
      expect(counter.props.style).toEqual(expect.objectContaining({ height: COUNTER_SIZE, width: COUNTER_SIZE }));
      expect(screen.getByText('٢ من ٣')).toBeTruthy();
      expect(screen.queryByTestId('azkar-counter-done')).toBeNull();
      expect(screen.queryByTestId('azkar-counter-check')).toBeNull();
    });

    it('calls onTap when pressed', async () => {
      const { ui, handlers } = renderCounter();
      await renderUi(ui);
      await press(screen.getByRole('button', { name: 'عداد الذكر ٢' }));
      expect(handlers.onTap).toHaveBeenCalledTimes(1);
    });

    it('exposes a reset accessibility action that calls onReset', async () => {
      const { ui, handlers } = renderCounter();
      await renderUi(ui);
      const counter = screen.getByRole('button', { name: 'عداد الذكر ٢' });
      expect(counter.props.accessibilityActions).toEqual([{ label: 'إعادة الضبط', name: 'reset' }]);
      fireEvent(counter, 'accessibilityAction', { nativeEvent: { actionName: 'reset' } });
      expect(handlers.onReset).toHaveBeenCalledTimes(1);
    });

    it('ignores other accessibility actions', async () => {
      const { ui, handlers } = renderCounter();
      await renderUi(ui);
      fireEvent(screen.getByRole('button', { name: 'عداد الذكر ٢' }), 'accessibilityAction', { nativeEvent: { actionName: 'other' } });
      expect(handlers.onReset).not.toHaveBeenCalled();
    });

    it('draws the ring for the value under Reduce Motion without animating', async () => {
      mockReduce.mockReturnValue(true);
      const { ui } = renderCounter({ value: 3 });
      await renderUi(ui);
      expect(screen.getByTestId('azkar-counter-ring')).toBeTruthy();
      expect(screen.getByText('٣ من ٣')).toBeTruthy();
    });

    it('renders in English with the English labels', async () => {
      const { ui } = renderCounter({ value: 1 });
      await renderUi(ui, { locale: 'en' });
      expect(screen.getByRole('button', { name: 'Counter for dhikr 2' }).props.accessibilityValue).toEqual({ text: '1 of 3' });
    });
  });

  describe('compact (a short window)', () => {
    it('is an 88 pt button that keeps its label, value and hint, with no caption under it', async () => {
      const { ui } = renderCounter({ compact: true });
      await renderUi(ui);
      const counter = screen.getByRole('button', { name: 'عداد الذكر ٢' });

      expect(counter.props.style).toEqual(expect.objectContaining({ height: COUNTER_SIZE_COMPACT, width: COUNTER_SIZE_COMPACT }));
      expect(COUNTER_SIZE_COMPACT).toBeGreaterThanOrEqual(44);
      expect(counter.props.accessibilityValue).toEqual({ text: '٢ من ٣' });
      expect(counter.props.accessibilityHint).toBeTruthy();
      expect(screen.queryByText(counter.props.accessibilityHint as string)).toBeNull();
    });

    it('keeps the check and «تم» for the single variant', async () => {
      const { ui } = renderCounter({ compact: true, requiredCount: null });
      await renderUi(ui);

      expect(screen.getByTestId('azkar-counter-check', { includeHiddenElements: true })).toBeOnTheScreen();
      expect(screen.getByTestId('azkar-counter-done')).toBeOnTheScreen();
    });

    it('shows the caption at the full size', async () => {
      const { ui } = renderCounter();
      await renderUi(ui);
      const counter = screen.getByRole('button', { name: 'عداد الذكر ٢' });

      expect(screen.getByText(counter.props.accessibilityHint as string)).toBeOnTheScreen();
    });
  });

  describe('a sourced count of 1 (one recitation, ADR 0031 §6)', () => {
    it('is the same ring, reading «٠ من ١» before the tap', async () => {
      const { ui } = renderCounter({ requiredCount: 1, value: 0 });
      await renderUi(ui);
      expect(screen.getByRole('button', { name: 'عداد الذكر ٢' }).props.accessibilityValue).toEqual({ text: '٠ من ١' });
      expect(screen.getByText('٠ من ١')).toBeTruthy();
      expect(screen.getByTestId('azkar-counter-ring')).toBeTruthy();
    });

    it('reads «١ من ١» once the count is reached', async () => {
      const { ui } = renderCounter({ requiredCount: 1, value: 1, completed: true });
      await renderUi(ui);
      expect(screen.getByRole('button', { name: 'عداد الذكر ٢' }).props.accessibilityValue).toEqual({ text: '١ من ١' });
    });

    it('completes on one tap through onTap', async () => {
      const { ui, handlers } = renderCounter({ requiredCount: 1, value: 0 });
      await renderUi(ui);
      await press(screen.getByRole('button', { name: 'عداد الذكر ٢' }));
      expect(handlers.onTap).toHaveBeenCalledTimes(1);
    });

    it('has no check and no «تم» label in its centre', async () => {
      const { ui } = renderCounter({ requiredCount: 1, value: 0 });
      await renderUi(ui);
      expect(screen.queryByTestId('azkar-counter-done')).toBeNull();
      expect(screen.queryByTestId('azkar-counter-check')).toBeNull();
    });
  });

  describe('no sourced count (the single variant, ADR 0031 §6)', () => {
    it('is a 120 pt ring button labelled «وضع علامة «تم»», with no number', async () => {
      const { ui } = renderCounter({ requiredCount: null, value: 0 });
      await renderUi(ui);
      const button = screen.getByRole('button', { name: 'وضع علامة «تم»' });
      expect(button.props.style).toEqual(expect.objectContaining({ height: COUNTER_SIZE, width: COUNTER_SIZE }));
      expect(button.props.accessibilityValue?.text).toBeUndefined();
      expect(screen.queryByText(/من/)).toBeNull();
      expect(screen.getByTestId('azkar-counter-ring')).toBeTruthy();
    });

    it('shows a check and the «تم» label inside the ring', async () => {
      const { ui } = renderCounter({ requiredCount: null, value: 0 });
      await renderUi(ui);
      expect(screen.getByTestId('azkar-counter-check', { includeHiddenElements: true })).toBeTruthy();
      expect(screen.getByTestId('azkar-counter-done')).toBeTruthy();
      expect(screen.getByText('تم')).toBeTruthy();
    });

    it('calls onTap once when pressed, and does not read a count', async () => {
      const { ui, handlers } = renderCounter({ requiredCount: null, value: 0 });
      await renderUi(ui);
      await press(screen.getByRole('button', { name: 'وضع علامة «تم»' }));
      expect(handlers.onTap).toHaveBeenCalledTimes(1);
    });

    it('keeps the reset action, so a done unit can be reset', async () => {
      const { ui, handlers } = renderCounter({ requiredCount: null, completed: true });
      await renderUi(ui);
      const button = screen.getByRole('button', { name: 'وضع علامة «تم»' });
      expect(button.props.accessibilityActions).toEqual([{ label: 'إعادة الضبط', name: 'reset' }]);
      fireEvent(button, 'accessibilityAction', { nativeEvent: { actionName: 'reset' } });
      expect(handlers.onReset).toHaveBeenCalledTimes(1);
    });

    it('fills the ring when completed, under Reduce Motion too', async () => {
      mockReduce.mockReturnValue(true);
      const { ui } = renderCounter({ requiredCount: null, completed: true });
      await renderUi(ui);
      expect(screen.getByTestId('azkar-counter-ring')).toBeTruthy();
      expect(screen.getByTestId('azkar-counter-done')).toBeTruthy();
    });

    it('renders in English with the English label; hint stays on the button only (AzkarReaderDone has no caption)', async () => {
      const { ui } = renderCounter({ requiredCount: null, value: 0 });
      await renderUi(ui, { locale: 'en' });
      const button = screen.getByRole('button', { name: 'Mark as done' });
      expect(button).toBeTruthy();
      expect(screen.getByText('Done')).toBeTruthy();
      expect(button.props.accessibilityHint).toBe('Tap to mark done');
      expect(screen.queryByText('Tap to mark done')).toBeNull();
    });

    it('draws no caption under the ring in Arabic either', async () => {
      const { ui } = renderCounter({ requiredCount: null, value: 0 });
      await renderUi(ui);
      const button = screen.getByRole('button', { name: 'وضع علامة «تم»' });
      expect(button.props.accessibilityHint).toBe('اضغط للإتمام');
      expect(screen.queryByText('اضغط للإتمام')).toBeNull();
    });
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarCounter.tsx')).toEqual([]);
  });
});
