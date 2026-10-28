import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { HighlightRow } from './HighlightRow';

const colors = themes.light.colors;
const hidden = { includeHiddenElements: true };

describe('HighlightRow', () => {
  it('renders the label and four colour swatches', async () => {
    const view = await renderUi(
      <HighlightRow label="تظليل" onSelect={() => undefined} selected={null} testID="row" />,
    );

    expect(view.getByText('تظليل')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'تظليل ذهبي' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'تظليل أخضر' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'تظليل أزرق' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'تظليل وردي' })).toBeOnTheScreen();
    expect(view.getAllByRole('button')).toHaveLength(4);
  });

  it('labels the swatch row with the label and names the swatch test ids from the row', async () => {
    const view = await renderUi(
      <HighlightRow label="Highlight" onSelect={() => undefined} selected={null} testID="row" />,
      { locale: 'en' },
    );

    expect(view.getByLabelText('Highlight')).toBeOnTheScreen();
    expect(view.getByTestId('row-gold')).toBeOnTheScreen();
    expect(view.getByTestId('row-rose')).toBeOnTheScreen();
  });

  it('marks only the selected swatch as selected', async () => {
    const view = await renderUi(
      <HighlightRow label="تظليل" onSelect={() => undefined} selected="green" testID="row" />,
    );

    expect(view.getByRole('button', { name: 'تظليل أخضر' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(view.getByRole('button', { name: 'تظليل ذهبي' }).props.accessibilityState).toMatchObject({ selected: false });
    expect(view.getByTestId('row-green-ring')).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('row-green-ring').props.style).borderColor).toBe(colors.ink);
  });

  it('calls onSelect with the pressed colour', async () => {
    const onSelect = jest.fn();
    const view = await renderUi(<HighlightRow label="Highlight" onSelect={onSelect} selected={null} />, {
      locale: 'en',
    });

    await fireEvent.press(view.getByRole('button', { name: 'Blue highlight' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('blue');
  });

  it('uses the surface background, a 16 pt radius and the frame padding', async () => {
    const view = await renderUi(
      <HighlightRow label="تظليل" onSelect={() => undefined} selected={null} testID="row" />,
    );

    expect(flatStyle(view.getByTestId('row').props.style)).toMatchObject({
      backgroundColor: colors.surface,
      borderRadius: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 6,
    });
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(
      <HighlightRow label="label" onSelect={() => undefined} selected={null} testID="row" />,
      { locale },
    );

    expect(view.getByTestId('row')).toBeOnTheScreen();
    expect(view.getAllByRole('button', hidden)).toHaveLength(4);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('HighlightRow.tsx')).toEqual([]);
  });
});
