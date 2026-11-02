import { fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { SibhaCustomTargetSheet } from './SibhaCustomTargetSheet';

function renderSheet(props: Partial<Parameters<typeof SibhaCustomTargetSheet>[0]> = {}, locale: 'ar' | 'en' = 'ar') {
  const onSave = jest.fn();
  const onClose = jest.fn();
  const view = renderUi(
    <SibhaCustomTargetSheet initialValue={null} onClose={onClose} onSave={onSave} visible {...props} />,
    { locale },
  );
  return { onClose, onSave, view };
}

describe('SibhaCustomTargetSheet', () => {
  it('shows the title, the explanation and the number field when visible', async () => {
    const { view } = renderSheet();
    const rendered = await view;

    expect(rendered.getByRole('header', { name: 'هدف مخصص' })).toBeOnTheScreen();
    expect(rendered.getByText('أدخل عددًا من ١ إلى ٩٩٩٩')).toBeOnTheScreen();
    expect(rendered.getByLabelText('عدد التسبيحات')).toBeOnTheScreen();
  });

  it('renders nothing when hidden', async () => {
    const { view } = renderSheet({ visible: false });
    const rendered = await view;

    expect(rendered.queryByTestId('sibha-custom-sheet')).toBeNull();
  });

  it('keeps Save off until the number is valid', async () => {
    const { view, onSave } = renderSheet();
    const rendered = await view;

    expect(rendered.getByRole('button', { name: 'حفظ' })).toBeDisabled();

    await fireEvent.changeText(rendered.getByLabelText('عدد التسبيحات'), '0');
    expect(rendered.getByRole('button', { name: 'حفظ' })).toBeDisabled();

    await fireEvent.changeText(rendered.getByLabelText('عدد التسبيحات'), '250');
    await fireEvent.press(rendered.getByRole('button', { name: 'حفظ' }));
    expect(onSave).toHaveBeenCalledWith(250);
  });

  it('accepts Arabic-Indic digits and keeps only digits', async () => {
    const { view, onSave } = renderSheet();
    const rendered = await view;

    await fireEvent.changeText(rendered.getByLabelText('عدد التسبيحات'), '٤٠a');
    expect(rendered.getByLabelText('عدد التسبيحات').props.value).toBe('٤٠');

    await fireEvent.press(rendered.getByRole('button', { name: 'حفظ' }));
    expect(onSave).toHaveBeenCalledWith(40);
  });

  it('starts from the current custom target', async () => {
    const { view } = renderSheet({ initialValue: 250 });
    const rendered = await view;

    expect(rendered.getByLabelText('عدد التسبيحات').props.value).toBe('٢٥٠');
  });

  it('closes from cancel and from the dimmed screen', async () => {
    const { view, onClose } = renderSheet();
    const rendered = await view;

    await fireEvent.press(rendered.getByRole('button', { name: 'إلغاء' }));
    await fireEvent.press(rendered.getByTestId('sibha-custom-sheet-scrim'));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('shows Western digits and English labels in English', async () => {
    const { view } = renderSheet({ initialValue: 40 }, 'en');
    const rendered = await view;

    expect(rendered.getByRole('header', { name: 'Custom target' })).toBeOnTheScreen();
    expect(rendered.getByLabelText('Number of counts').props.value).toBe('40');
    expect(rendered.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/sibha/components/SibhaCustomTargetSheet.tsx')).toEqual([]);
  });
});

describe('SibhaCustomTargetSheet keyboard (ADR 0036)', () => {
  it('lifts the card with the keyboard through a keyboard-avoiding view', async () => {
    const rendered = await renderUi(<SibhaCustomTargetSheet initialValue={null} onClose={jest.fn()} onSave={jest.fn()} visible />);

    expect(rendered.getByTestId('sibha-custom-sheet-keyboard')).toBeOnTheScreen();
    expect(rendered.getByTestId('sibha-custom-sheet')).toBeOnTheScreen();
    expect(rendered.getByTestId('sibha-custom-sheet-input')).toBeOnTheScreen();
  });
});

describe('SibhaCustomTargetSheet keyboard avoidance by platform', () => {
  let platform: { restore: () => void } | undefined;

  afterEach(() => {
    platform?.restore();
    platform = undefined;
  });

  it('pads the card above the keyboard on iOS, so the number field stays in view', async () => {
    platform = jest.replaceProperty(Platform, 'OS', 'ios');
    const view = await renderUi(
      <SibhaCustomTargetSheet initialValue={null} onClose={jest.fn()} onSave={jest.fn()} visible />,
    );

    expect(view.getByTestId('sibha-custom-sheet-keyboard').props.behavior).toBe('padding');
  });

  it('resizes the card for the keyboard on Android', async () => {
    platform = jest.replaceProperty(Platform, 'OS', 'android');
    const view = await renderUi(
      <SibhaCustomTargetSheet initialValue={null} onClose={jest.fn()} onSave={jest.fn()} visible />,
    );

    expect(view.getByTestId('sibha-custom-sheet-keyboard').props.behavior).toBe('height');
  });
});
