import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { ReciterFilterChips, type ReciterFilterOption } from './ReciterFilterChips';

const options: ReciterFilterOption<string>[] = [
  { value: 'all', label: 'الكل' },
  { value: 'murattal', label: 'مرتّل' },
  { value: 'downloaded', label: 'المحمّلة', disabled: true },
];

describe('ReciterFilterChips', () => {
  it('lays the chips out in a wrapping row labelled as the filter group', async () => {
    const view = await renderUi(
      <ReciterFilterChips label="تصفية القرّاء" onSelect={() => undefined} options={options} selected="all" />,
    );
    const group = view.getByLabelText('تصفية القرّاء');

    expect(flatStyle(group.props.style)).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap', gap: 8 });
    expect(view.getAllByRole('radio').map((chip) => chip.props.accessibilityLabel)).toEqual(['الكل', 'مرتّل', 'المحمّلة']);
  });

  it('marks only the selected option as checked', async () => {
    const view = await renderUi(
      <ReciterFilterChips label="g" onSelect={() => undefined} options={options} selected="murattal" />,
    );

    expect(view.getByRole('radio', { name: 'مرتّل' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(view.getByRole('radio', { name: 'الكل' }).props.accessibilityState).toMatchObject({ checked: false });
  });

  it('reports the value of the chip pressed', async () => {
    const onSelect = jest.fn();
    const view = await renderUi(
      <ReciterFilterChips label="g" onSelect={onSelect} options={options} selected="all" />,
    );

    await fireEvent.press(view.getByRole('radio', { name: 'مرتّل' }));

    expect(onSelect).toHaveBeenCalledWith('murattal');
  });

  it('does not report a disabled chip', async () => {
    const onSelect = jest.fn();
    const view = await renderUi(
      <ReciterFilterChips label="g" onSelect={onSelect} options={options} selected="all" />,
    );

    await fireEvent.press(view.getByRole('radio', { name: 'المحمّلة' }));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(
      <ReciterFilterChips label="Filter" onSelect={() => undefined} options={[{ value: 'all', label: 'All' }]} selected="all" />,
      { locale },
    );

    expect(view.getByLabelText('Filter')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/audio/components/ReciterFilterChips.tsx')).toEqual([]);
  });
});
