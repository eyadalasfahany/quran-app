import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { SIBHA_LABEL_MAX } from '../data/model';
import { SibhaLabelField } from './SibhaLabelField';

describe('SibhaLabelField', () => {
  it('shows the placeholder when empty, and the typed label when there is one', async () => {
    const empty = await renderUi(<SibhaLabelField onChangeText={jest.fn()} value="" />);
    expect(empty.getByLabelText('تسمية اختيارية').props.placeholder).toBe('تسمية اختيارية');
    expect(empty.getByLabelText('تسمية اختيارية').props.value).toBe('');

    const typed = await renderUi(<SibhaLabelField onChangeText={jest.fn()} value="تسمية تجريبية" />);
    expect(typed.getByLabelText('تسمية اختيارية').props.value).toBe('تسمية تجريبية');
  });

  it('reports each change of the text', async () => {
    const onChangeText = jest.fn();
    const view = await renderUi(<SibhaLabelField onChangeText={onChangeText} value="" />);

    await fireEvent.changeText(view.getByLabelText('تسمية اختيارية'), 'نص تجريبي ١');

    expect(onChangeText).toHaveBeenCalledWith('نص تجريبي ١');
  });

  it('limits the label length', async () => {
    const view = await renderUi(<SibhaLabelField onChangeText={jest.fn()} value="" />);

    expect(view.getByLabelText('تسمية اختيارية').props.maxLength).toBe(SIBHA_LABEL_MAX);
  });

  it('uses the English placeholder in English', async () => {
    const view = await renderUi(<SibhaLabelField onChangeText={jest.fn()} value="" />, { locale: 'en' });

    expect(view.getByLabelText('Optional label').props.placeholder).toBe('Optional label');
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/sibha/components/SibhaLabelField.tsx')).toEqual([]);
  });
});
