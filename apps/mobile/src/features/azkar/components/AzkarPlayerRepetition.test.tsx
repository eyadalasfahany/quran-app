import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';

import { AzkarPlayerRepetition } from './AzkarPlayerRepetition';

describe('AzkarPlayerRepetition', () => {
  it('shows the repetition in Arabic, «٢ من ٣»', async () => {
    await renderUi(<AzkarPlayerRepetition current={2} total={3} />);
    expect(screen.getByText('٢ من ٣')).toBeTruthy();
  });

  it('is announced with its full spoken form and polite live region', async () => {
    await renderUi(<AzkarPlayerRepetition current={1} total={3} />);
    const label = screen.getByLabelText('التكرار ١ من ٣');
    expect(label.props.accessibilityRole).toBe('text');
    expect(label.props.accessibilityLiveRegion).toBe('polite');
  });

  it('reads in English', async () => {
    await renderUi(<AzkarPlayerRepetition current={3} total={3} />, { locale: 'en' });
    expect(screen.getByLabelText('Repetition 3 of 3')).toBeTruthy();
    expect(screen.getByText('3 of 3')).toBeTruthy();
  });

  it('renders a single repetition', async () => {
    await renderUi(<AzkarPlayerRepetition current={1} total={1} />);
    expect(screen.getByText('١ من ١')).toBeTruthy();
  });
});
