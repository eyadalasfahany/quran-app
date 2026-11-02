import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';

import { AzkarOfflinePill } from './AzkarOfflinePill';

describe('AzkarOfflinePill', () => {
  it('renders the offline message as text, not as a button', async () => {
    await renderUi(<AzkarOfflinePill />);
    const pill = screen.getByLabelText('غير متاح دون اتصال');
    expect(pill.props.accessibilityRole).toBe('text');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('carries the hint that explains the network need', async () => {
    await renderUi(<AzkarOfflinePill />);
    expect(screen.getByLabelText('غير متاح دون اتصال').props.accessibilityHint).toBe('يتطلب هذا التسجيل اتصالًا بالإنترنت');
  });

  it('renders under English with the English message', async () => {
    await renderUi(<AzkarOfflinePill />, { locale: 'en' });
    expect(screen.getByLabelText('Not available offline')).toBeTruthy();
  });
});
