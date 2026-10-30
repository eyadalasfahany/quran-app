import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { KhatmaDurationPicker } from './KhatmaDurationPicker';

describe('KhatmaDurationPicker', () => {
  it('calls onChange when a duration is selected', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<KhatmaDurationPicker onChange={onChange} value={30} />);

    fireEvent.press(view.getByRole('tab', { name: '٧ يومًا' }));

    expect(onChange).toHaveBeenCalledWith(7);
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<KhatmaDurationPicker onChange={jest.fn()} value={30} />, { locale });
    expect(view.getByText(locale === 'en' ? 'Finish in' : 'أختم خلال')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/khatma/components/KhatmaDurationPicker.tsx')).toEqual([]);
  });
});
