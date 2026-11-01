import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarTextSizeControl } from './AzkarTextSizeControl';

describe('AzkarTextSizeControl', () => {
  it('shows the current percentage from the reader stepper', async () => {
    await renderUi(<AzkarTextSizeControl onChange={jest.fn()} value={1} />);
    expect(screen.getByText('١٠٠٪')).toBeTruthy();
  });

  it('passes the stepped size to onChange', async () => {
    const onChange = jest.fn();
    await renderUi(<AzkarTextSizeControl onChange={onChange} value={1} />);
    await press(screen.getByRole('button', { name: 'تكبير الخط' }));
    expect(onChange).toHaveBeenCalledWith(expect.any(Number));
    expect(onChange.mock.calls[0]?.[0]).toBeGreaterThan(1);
  });

  it('steps smaller and never goes below the minimum', async () => {
    const onChange = jest.fn();
    await renderUi(<AzkarTextSizeControl onChange={onChange} value={1} />);
    await press(screen.getByRole('button', { name: 'تصغير الخط' }));
    expect(onChange.mock.calls[0]?.[0]).toBeLessThan(1);
  });

  it('renders the English step labels', async () => {
    await renderUi(<AzkarTextSizeControl onChange={jest.fn()} value={1} />, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Increase text size' })).toBeTruthy();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarTextSizeControl.tsx')).toEqual([]);
  });
});
