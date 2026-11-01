import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { ThemeProvider } from '@/core/theme';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarStaggeredRow } from './AzkarStaggeredRow';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const mockReduce = useReducedMotion as unknown as jest.Mock;

function row(index: number) {
  return (
    <ThemeProvider name="light">
      <AzkarStaggeredRow index={index}>
        <Text>{`FIXTURE row ${index}`}</Text>
      </AzkarStaggeredRow>
    </ThemeProvider>
  );
}

describe('AzkarStaggeredRow', () => {
  beforeEach(() => mockReduce.mockReturnValue(false));

  it('renders its child in a row wrapper', async () => {
    await render(row(0));
    expect(screen.getByTestId('azkar-staggered-row')).toBeTruthy();
    expect(screen.getByText('FIXTURE row 0')).toBeTruthy();
  });

  it('fades in on mount', async () => {
    await render(row(2));
    expect(screen.getByTestId('azkar-staggered-row').props.entering).toBeDefined();
  });

  it('keeps the child under Reduce Motion, with a plain fade', async () => {
    mockReduce.mockReturnValue(true);
    await render(row(5));
    expect(screen.getByTestId('azkar-staggered-row').props.entering).toBeDefined();
    expect(screen.getByText('FIXTURE row 5')).toBeTruthy();
  });

  it('uses theme tokens rather than raw colours', async () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarStaggeredRow.tsx')).toEqual([]);
  });
});
