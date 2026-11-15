import { fireEvent, screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';

import { MushafPageError } from './MushafPageError';

describe('MushafPageError', () => {
  it('renders the message and a retry button at the page size', async () => {
    await renderUi(<MushafPageError height={512} onRetry={jest.fn()} testID="err" width={321} />);
    expect(screen.getByText('تعذّر تحميل هذه الصفحة.')).toBeTruthy();
    expect(screen.getByRole('button')).toBeTruthy();
    expect(screen.getByTestId('err')).toBeTruthy();
  });

  it('calls onRetry when the retry button is pressed', async () => {
    const onRetry = jest.fn();
    await renderUi(<MushafPageError height={512} onRetry={onRetry} width={321} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
