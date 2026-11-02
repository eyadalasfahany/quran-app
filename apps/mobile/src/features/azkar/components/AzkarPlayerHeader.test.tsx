import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';

import { AzkarPlayerHeader } from './AzkarPlayerHeader';

describe('AzkarPlayerHeader', () => {
  it('shows the caption as a header', async () => {
    await renderUi(<AzkarPlayerHeader caption="يُتلى الآن" onMinimize={jest.fn()} />);
    expect(screen.getByRole('header', { name: 'يُتلى الآن' })).toBeTruthy();
  });

  it('minimises through its labelled button', async () => {
    const onMinimize = jest.fn();
    await renderUi(<AzkarPlayerHeader caption="يُتلى الآن" onMinimize={onMinimize} />);
    await press(screen.getByRole('button', { name: 'تصغير المشغّل' }));
    expect(onMinimize).toHaveBeenCalledTimes(1);
  });

  it('renders in English', async () => {
    await renderUi(<AzkarPlayerHeader caption="Now playing" onMinimize={jest.fn()} />, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Minimize player' })).toBeTruthy();
  });
});
