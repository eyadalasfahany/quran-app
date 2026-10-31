import { fireEvent, screen } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarCounter, COUNTER_SIZE } from './AzkarCounter';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { ...actual, useReducedMotion: jest.fn(() => false) };
});

const mockReduce = useReducedMotion as unknown as jest.Mock;

function renderCounter(props: Partial<Parameters<typeof AzkarCounter>[0]> = {}, locale: 'ar' | 'en' = 'ar') {
  const handlers = { onTap: jest.fn(), onReset: jest.fn() };
  const ui = <AzkarCounter position={2} requiredCount={3} value={2} {...handlers} {...props} />;
  return { handlers, ui, locale };
}

describe('AzkarCounter', () => {
  beforeEach(() => mockReduce.mockReturnValue(false));

  it('is a 120 pt button labelled with its position and valued with «٢ من ٣»', async () => {
    const { ui } = renderCounter();
    await renderUi(ui);
    const counter = screen.getByRole('button', { name: 'عداد الذكر ٢' });
    expect(counter.props.accessibilityValue).toEqual({ text: '٢ من ٣' });
    expect(counter.props.style).toEqual(expect.objectContaining({ height: COUNTER_SIZE, width: COUNTER_SIZE }));
    expect(screen.getByText('٢ من ٣')).toBeTruthy();
  });

  it('shows zero of one before the first tap of a single-count dhikr', async () => {
    const { ui } = renderCounter({ requiredCount: 1, value: 0 });
    await renderUi(ui);
    expect(screen.queryByText('٠ من ١')).toBeTruthy();
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

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarCounter.tsx')).toEqual([]);
  });
});
