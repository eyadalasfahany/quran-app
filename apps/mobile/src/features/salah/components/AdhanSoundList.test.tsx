import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { AdhanSoundList } from './AdhanSoundList';

const noop = () => undefined;

// The name, check and pill sit in accessibility-hidden groups (the radio carries the label), so tests query them too.
const hidden = { includeHiddenElements: true };

/** The radiogroup is a plain View with a label: role queries need `accessible`, so it is found by its label. */
function group(view: { getByLabelText: (text: string) => { props: Record<string, unknown> } }, name: string) {
  const element = view.getByLabelText(name);
  expect(element.props.accessibilityRole).toBe('radiogroup');
  return element;
}

const ORDER_AR = ['الله أكبر', 'المسجد الحرام', 'المسجد النبوي', 'صوت النظام', 'صامت'];

describe('AdhanSoundList', () => {
  it('is a radiogroup titled «صوت الأذان» holding the five sound rows in order', async () => {
    const view = await renderUi(<AdhanSoundList onSelect={noop} onTogglePreview={noop} previewingId={null} progress={0} selected="allahu_akbar_short" />);

    group(view, 'صوت الأذان');
    const radios = view.getAllByRole('radio');
    expect(radios.map((radio) => radio.props.accessibilityLabel)).toEqual(ORDER_AR);
  });

  it('checks only the selected sound', async () => {
    const view = await renderUi(<AdhanSoundList onSelect={noop} onTogglePreview={noop} previewingId={null} progress={0} selected="silent" />);

    const checked = view.getAllByRole('radio').filter((radio) => radio.props.accessibilityState?.checked);
    expect(checked.map((radio) => radio.props.accessibilityLabel)).toEqual(['صامت']);
  });

  it('marks the default voice with the الافتراضي pill, and only that one', async () => {
    const view = await renderUi(<AdhanSoundList onSelect={noop} onTogglePreview={noop} previewingId={null} progress={0} selected="silent" />);

    expect(view.getByTestId('adhan-sound-list-allahu_akbar_short-default', hidden)).toHaveTextContent('الافتراضي');
    expect(view.queryByTestId('adhan-sound-list-makkah-default', hidden)).toBeNull();
  });

  it('gives a play button to the three voices only', async () => {
    const view = await renderUi(<AdhanSoundList onSelect={noop} onTogglePreview={noop} previewingId={null} progress={0} selected="silent" />);

    const buttons = view.getAllByRole('button');
    expect(buttons.map((button) => button.props.accessibilityLabel)).toEqual([
      'تشغيل الله أكبر',
      'تشغيل المسجد الحرام',
      'تشغيل المسجد النبوي',
    ]);
  });

  it('selects a sound by its id when its row is pressed', async () => {
    const onSelect = jest.fn();
    const view = await renderUi(<AdhanSoundList onSelect={onSelect} onTogglePreview={noop} previewingId={null} progress={0} selected="allahu_akbar_short" />);

    fireEvent.press(view.getByRole('radio', { name: 'صوت النظام' }));

    expect(onSelect).toHaveBeenCalledWith('system');
  });

  it('toggles the preview of the voice whose button is pressed, without selecting it', async () => {
    const onSelect = jest.fn();
    const onTogglePreview = jest.fn();
    const view = await renderUi(<AdhanSoundList onSelect={onSelect} onTogglePreview={onTogglePreview} previewingId={null} progress={0} selected="allahu_akbar_short" />);

    fireEvent.press(view.getByRole('button', { name: 'تشغيل المسجد النبوي' }));

    expect(onTogglePreview).toHaveBeenCalledWith('madinah');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows the stop label on the voice that plays, and the other voices keep play', async () => {
    const view = await renderUi(<AdhanSoundList onSelect={noop} onTogglePreview={noop} previewingId="makkah" progress={0.5} selected="allahu_akbar_short" />);

    expect(view.getByRole('button', { name: 'إيقاف المسجد الحرام' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'تشغيل الله أكبر' })).toBeOnTheScreen();
  });

  it('shows the footer note under the card', async () => {
    const view = await renderUi(<AdhanSoundList onSelect={noop} onTogglePreview={noop} previewingId={null} progress={0} selected="silent" />);

    expect(view.getByText('يُسمع الصوت عندما لا يكون الهاتف على الوضع الصامت.')).toBeOnTheScreen();
  });

  it.each(locales)('renders in %s', async (locale) => {
    const view = await renderUi(<AdhanSoundList onSelect={noop} onTogglePreview={noop} previewingId={null} progress={0} selected="silent" />, { locale });

    group(view, locale === 'en' ? 'Adhan sound' : 'صوت الأذان');
    expect(view.getAllByRole('radio')).toHaveLength(5);
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/salah/components/AdhanSoundList.tsx')).toEqual([]);
  });
});
