import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';

import { MoonNoLocation } from './MoonNoLocation';

describe('MoonNoLocation', () => {
  it('calls onOpenSalah from the action button', async () => {
    const onOpenSalah = jest.fn();
    const view = await renderUi(<MoonNoLocation onOpenSalah={onOpenSalah} />);
    fireEvent.press(view.getByTestId('moon-no-location-empty-action'));
    expect(onOpenSalah).toHaveBeenCalledTimes(1);
  });
});
