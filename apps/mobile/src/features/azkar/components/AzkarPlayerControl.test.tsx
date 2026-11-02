import { screen } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';

import { AzkarPlayerControl } from './AzkarPlayerControl';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const mockReduceMotion = useReducedMotion as unknown as jest.Mock;

describe('AzkarPlayerControl', () => {
  beforeEach(() => {
    mockReduceMotion.mockReturnValue(false);
  });

  it('is labelled play while paused', async () => {
    await renderUi(<AzkarPlayerControl onPress={jest.fn()} playing={false} />);
    expect(screen.getByRole('button', { name: 'تشغيل التسجيل' })).toBeTruthy();
  });

  it('is labelled pause while playing', async () => {
    await renderUi(<AzkarPlayerControl onPress={jest.fn()} playing />);
    expect(screen.getByRole('button', { name: 'إيقاف التسجيل مؤقتًا' })).toBeTruthy();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    await renderUi(<AzkarPlayerControl onPress={onPress} playing={false} />);
    await press(screen.getByRole('button', { name: 'تشغيل التسجيل' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await renderUi(<AzkarPlayerControl disabled onPress={onPress} playing={false} />);
    await press(screen.getByRole('button', { name: 'تشغيل التسجيل' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('draws both glyphs so the morph has two frames', async () => {
    await renderUi(<AzkarPlayerControl onPress={jest.fn()} playing={false} testID="ctl" />);
    expect(screen.getByTestId('ctl-play', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('ctl-pause', { includeHiddenElements: true })).toBeTruthy();
  });

  it('renders the larger variant with the same role and label', async () => {
    await renderUi(<AzkarPlayerControl onPress={jest.fn()} playing={false} size="sheet" />);
    expect(screen.getByRole('button', { name: 'تشغيل التسجيل' })).toBeTruthy();
  });

  it('works under Reduce Motion, with the same label', async () => {
    mockReduceMotion.mockReturnValue(true);
    await renderUi(<AzkarPlayerControl onPress={jest.fn()} playing />);
    expect(screen.getByRole('button', { name: 'إيقاف التسجيل مؤقتًا' })).toBeTruthy();
  });

  it('is labelled in English', async () => {
    await renderUi(<AzkarPlayerControl onPress={jest.fn()} playing={false} />, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Play recording' })).toBeTruthy();
  });
});
