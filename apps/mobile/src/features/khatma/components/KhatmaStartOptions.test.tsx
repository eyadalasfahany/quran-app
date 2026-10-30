import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { KhatmaStartOptions } from './KhatmaStartOptions';

describe('KhatmaStartOptions', () => {
  it('selects the beginning option', async () => {
    const onChange = jest.fn();
    const view = await renderUi(
      <KhatmaStartOptions lastReadLabel="البقرة ٢٥٥" onChange={onChange} value="lastRead" />,
    );

    fireEvent.press(view.getByTestId('khatma-start-options-beginning'));
    expect(onChange).toHaveBeenCalledWith('beginning');
  });

  it('renders a single option when last-read is hidden', async () => {
    const view = await renderUi(
      <KhatmaStartOptions lastReadLabel="" onChange={jest.fn()} showLastRead={false} value="beginning" />,
    );

    expect(view.queryByTestId('khatma-start-options-lastRead')).toBeNull();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(
      <KhatmaStartOptions lastReadLabel="Al-Baqarah 255" onChange={jest.fn()} value="beginning" />,
      { locale },
    );
    expect(view.getByRole('radio', { checked: true })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/khatma/components/KhatmaStartOptions.tsx')).toEqual([]);
  });
});
