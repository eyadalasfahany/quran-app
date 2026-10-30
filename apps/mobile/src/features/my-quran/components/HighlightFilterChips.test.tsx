import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { HighlightFilterChips } from './HighlightFilterChips';

describe('HighlightFilterChips', () => {
  it.each(locales)('renders «الكل» and the four colours as radio options (%s)', async (locale) => {
    const view = await renderUi(<HighlightFilterChips onChange={jest.fn()} value={null} />, { locale });

    const labels =
      locale === 'ar' ? ['الكل', 'ذهبي', 'أخضر', 'أزرق', 'وردي'] : ['All', 'Gold', 'Green', 'Blue', 'Rose'];
    for (const label of labels) {
      expect(view.getByRole('radio', { name: label })).toBeOnTheScreen();
    }
    expect(view.getByRole('radio', { name: labels[0] ?? '' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
  });

  it('reports the picked colour and goes back to «الكل»', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<HighlightFilterChips onChange={onChange} value="gold" />);

    expect(view.getByRole('radio', { name: 'ذهبي' }).props.accessibilityState).toMatchObject({ checked: true });

    fireEvent.press(view.getByRole('radio', { name: 'أخضر' }));
    expect(onChange).toHaveBeenCalledWith('green');

    fireEvent.press(view.getByRole('radio', { name: 'الكل' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
