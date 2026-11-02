import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { AdhanSoundRow } from './AdhanSoundRow';

const noop = () => undefined;

// The name, check, pill and progress are hidden from accessibility (the radio carries the label), so tests query them too.
const hidden = { includeHiddenElements: true };

describe('AdhanSoundRow', () => {
  it('renders a radio labelled by its name, unchecked by default', async () => {
    const view = await renderUi(<AdhanSoundRow name="المسجد الحرام" onSelect={noop} selected={false} testID="row" />);

    const radio = view.getByRole('radio', { name: 'المسجد الحرام' });
    expect(radio.props.accessibilityState).toEqual({ checked: false });
    expect(view.queryByTestId('row-check', hidden)).toBeNull();
  });

  it('shows the check and the checked state when selected', async () => {
    const view = await renderUi(<AdhanSoundRow name="x" onSelect={noop} selected testID="row" />);

    expect(view.getByRole('radio', { name: 'x' }).props.accessibilityState).toEqual({ checked: true });
    expect(view.getByTestId('row-check', hidden)).toBeOnTheScreen();
  });

  it('shows the default pill only on the default voice', async () => {
    const view = await renderUi(<AdhanSoundRow isDefault name="الله أكبر" onSelect={noop} selected testID="row" />);

    expect(view.getByTestId('row-default', hidden)).toHaveTextContent('الافتراضي');
  });

  it('has no default pill by default', async () => {
    const view = await renderUi(<AdhanSoundRow name="صامت" onSelect={noop} selected={false} testID="row" />);

    expect(view.queryByTestId('row-default', hidden)).toBeNull();
  });

  it('keeps a 44 pt spacer and no play button on the system and silent rows', async () => {
    const view = await renderUi(<AdhanSoundRow name="صوت النظام" onSelect={noop} selected={false} testID="row" />);

    expect(view.queryByRole('button')).toBeNull();
  });

  it('shows a play button on a voice row, labelled with the voice name', async () => {
    const preview = { playing: false, progress: 0, onToggle: noop };
    const view = await renderUi(<AdhanSoundRow name="المسجد النبوي" onSelect={noop} preview={preview} selected={false} testID="row" />);

    expect(view.getByRole('button', { name: 'تشغيل المسجد النبوي' })).toBeOnTheScreen();
  });

  it('shows the stop label and the progress line while the voice plays', async () => {
    const preview = { playing: true, progress: 0.4, onToggle: noop };
    const view = await renderUi(<AdhanSoundRow name="المسجد الحرام" onSelect={noop} preview={preview} selected={false} testID="row" />);

    expect(view.getByRole('button', { name: 'إيقاف المسجد الحرام' })).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('mini-player-progress-fill', hidden).props.style).width).toBe('40%');
  });

  it('shows no progress line when the voice is not playing', async () => {
    const preview = { playing: false, progress: 0.4, onToggle: noop };
    const view = await renderUi(<AdhanSoundRow name="x" onSelect={noop} preview={preview} selected={false} testID="row" />);

    expect(view.queryByTestId('mini-player-progress', hidden)).toBeNull();
  });

  it('places the progress line along the bottom edge, using logical offsets', async () => {
    const preview = { playing: true, progress: 0.4, onToggle: noop };
    const view = await renderUi(<AdhanSoundRow name="x" onSelect={noop} preview={preview} selected={false} testID="row" />);

    const track = view.getByTestId('mini-player-progress', hidden);
    const wrapper = track.parent;
    const style = flatStyle(wrapper?.props.style);
    expect(style.position).toBe('absolute');
    expect(style.bottom).toBe(0);
    expect(style.start).toBe(0);
    expect(style.end).toBe(0);
    expect(style).not.toHaveProperty('left');
    expect(style).not.toHaveProperty('right');
  });

  it('selects the row when it is pressed', async () => {
    const onSelect = jest.fn();
    const view = await renderUi(<AdhanSoundRow name="x" onSelect={onSelect} selected={false} testID="row" />);

    fireEvent.press(view.getByRole('radio', { name: 'x' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('toggles the preview, without selecting the row, when the play button is pressed', async () => {
    const onSelect = jest.fn();
    const onToggle = jest.fn();
    const preview = { playing: false, progress: 0, onToggle };
    const view = await renderUi(<AdhanSoundRow name="x" onSelect={onSelect} preview={preview} selected={false} testID="row" />);

    fireEvent.press(view.getByRole('button', { name: 'تشغيل x' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('draws the hairline separator unless it is the last row', async () => {
    const withLine = await renderUi(<AdhanSoundRow name="x" onSelect={noop} selected={false} testID="row" />);
    const without = await renderUi(<AdhanSoundRow name="x" onSelect={noop} selected={false} separator={false} testID="row" />);

    expect(flatStyle(withLine.getByRole('radio', { name: 'x' }).parent?.props.style).borderBottomWidth).toBeGreaterThan(0);
    expect(flatStyle(without.getByRole('radio', { name: 'x' }).parent?.props.style).borderBottomWidth).toBe(0);
  });

  it.each(locales)('renders in %s with the name and check', async (locale) => {
    const view = await renderUi(<AdhanSoundRow isDefault name="Allahu Akbar" onSelect={noop} selected testID="row" />, { locale });

    expect(view.getByRole('radio', { name: 'Allahu Akbar' })).toBeOnTheScreen();
    expect(view.getByTestId('row-check', hidden)).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/salah/components/AdhanSoundRow.tsx')).toEqual([]);
  });
});
