import { screen } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarCompletion } from './AzkarCompletion';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const mockReduce = useReducedMotion as unknown as jest.Mock;

function renderCompletion(onBack = jest.fn(), onRestart = jest.fn()) {
  return {
    onBack,
    onRestart,
    ui: <AzkarCompletion onBack={onBack} onRestart={onRestart} progressText="٢٤ من ٢٤" title="أذكار الصباح" />,
  };
}

describe('AzkarCompletion', () => {
  beforeEach(() => mockReduce.mockReturnValue(false));

  it('shows the finished title and the full count', async () => {
    const { ui } = renderCompletion();
    await renderUi(ui);
    expect(screen.getByRole('header', { name: 'أتممت أذكار الصباح' })).toBeTruthy();
    expect(screen.getByText('٢٤ من ٢٤')).toBeTruthy();
  });

  it('grows in as the finished state appears', async () => {
    const { ui } = renderCompletion();
    await renderUi(ui);
    expect(screen.getByTestId('azkar-completion').props.entering).toBeDefined();
  });

  it('grows in under Reduce Motion as a plain fade, with the content unchanged', async () => {
    mockReduce.mockReturnValue(true);
    const { ui } = renderCompletion();
    await renderUi(ui);
    expect(screen.getByTestId('azkar-completion').props.entering).toBeDefined();
    expect(screen.getByRole('header', { name: 'أتممت أذكار الصباح' })).toBeTruthy();
  });

  it('returns to Azkar from the primary button', async () => {
    const { ui, onBack } = renderCompletion();
    await renderUi(ui);
    await press(screen.getByRole('button', { name: 'العودة إلى الأذكار' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('restarts the scope from the secondary button', async () => {
    const { ui, onRestart } = renderCompletion();
    await renderUi(ui);
    await press(screen.getByRole('button', { name: 'البدء من جديد' }));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('renders the English labels', async () => {
    await renderUi(<AzkarCompletion onBack={jest.fn()} onRestart={jest.fn()} progressText="24 of 24" title="Morning" />, {
      locale: 'en',
    });
    expect(screen.getByRole('header', { name: 'You finished Morning' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start again' })).toBeTruthy();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarCompletion.tsx')).toEqual([]);
  });
});
