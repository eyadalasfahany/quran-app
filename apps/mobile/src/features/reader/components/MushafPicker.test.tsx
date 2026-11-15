import * as Haptics from 'expo-haptics';
import { fireEvent } from '@testing-library/react-native';

import { featureComponentLiterals } from '../../../../jest/ui-source';
import { locales, renderUi } from '../../../../jest/render-ui';
import { MushafPicker } from './MushafPicker';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

const names = {
  ar: { hafs: 'حفص عن عاصم', warsh: 'ورش عن نافع', qalun: 'قالون عن نافع', shubah: 'شعبة عن عاصم', duri: 'الدوري عن أبي عمرو' },
  en: { hafs: 'Hafs from Asim', warsh: 'Warsh from Nafi', qalun: 'Qalun from Nafi', shubah: "Shu'bah from Asim", duri: 'Al-Duri from Abu Amr' },
} as const;

describe('MushafPicker', () => {
  beforeEach(() => {
    jest.mocked(Haptics.selectionAsync).mockClear();
  });

  it.each(locales)('renders the five riwayat in order with their names (%s)', async (locale) => {
    const view = await renderUi(<MushafPicker accessibilityLabel="group" onChange={() => undefined} value="hafs" />, {
      locale,
    });
    const radios = view.getAllByRole('radio');

    expect(radios).toHaveLength(5);
    expect(radios.map((radio) => radio.props.testID)).toEqual(['mushaf-hafs', 'mushaf-warsh', 'mushaf-qalun', 'mushaf-shubah', 'mushaf-duri']);
    for (const key of ['hafs', 'warsh', 'qalun', 'shubah', 'duri'] as const) {
      expect(view.getByTestId(`mushaf-${key}`)).toBeOnTheScreen();
      expect(view.getByText(names[locale][key])).toBeOnTheScreen();
    }
  });

  it('is a labelled radio group with the chosen mushaf checked', async () => {
    const view = await renderUi(<MushafPicker accessibilityLabel="اختيار المصحف" onChange={() => undefined} value="warsh" />);
    const group = view.getByTestId('mushaf-picker');

    expect(group.props.accessibilityRole).toBe('radiogroup');
    expect(group.props.accessibilityLabel).toBe('اختيار المصحف');
    expect(view.getByTestId('mushaf-hafs').props.accessibilityState?.checked).toBe(false);
    expect(view.getByTestId('mushaf-warsh').props.accessibilityState?.checked).toBe(true);
  });

  it('reports a newly pressed mushaf with a selection haptic', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<MushafPicker accessibilityLabel="group" onChange={onChange} value="hafs" />);

    await fireEvent.press(view.getByTestId('mushaf-duri'));

    expect(onChange).toHaveBeenCalledWith('duri');
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the chosen mushaf is pressed again', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<MushafPicker accessibilityLabel="group" onChange={onChange} value="hafs" />);

    await fireEvent.press(view.getByTestId('mushaf-hafs'));

    expect(onChange).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });

  it.each(locales)('subtitles each card with the publisher and edition year (%s)', async (locale) => {
    const view = await renderUi(<MushafPicker accessibilityLabel="group" onChange={() => undefined} value="hafs" />, {
      locale,
    });

    expect(view.getByText(locale === 'ar' ? 'مجمع الملك فهد · ١٤٤١هـ' : 'King Fahd Complex · 1441 AH')).toBeOnTheScreen();
    // Qalun, Shu'bah and al-Duri share the 1443H edition.
    expect(view.getAllByText(locale === 'ar' ? 'مجمع الملك فهد · ١٤٤٣هـ' : 'King Fahd Complex · 1443 AH')).toHaveLength(3);
  });

  it('adds the download state when a mushaf is downloaded', async () => {
    const view = await renderUi(
      <MushafPicker
        accessibilityLabel="group"
        downloaded={(key) => key === 'hafs'}
        onChange={() => undefined}
        sizeBytes={() => 73_000_000}
        value="hafs"
      />,
    );

    expect(view.getByText('مجمع الملك فهد · ١٤٤١هـ · مُنزَّل')).toBeOnTheScreen();
  });

  it.each(locales)('adds the size in megabytes when a mushaf is not downloaded (%s)', async (locale) => {
    const view = await renderUi(
      <MushafPicker
        accessibilityLabel="group"
        downloaded={() => false}
        onChange={() => undefined}
        sizeBytes={(key) => (key === 'warsh' ? 73_400_000 : undefined)}
        value="hafs"
      />,
      { locale },
    );

    expect(view.getByText(locale === 'ar' ? 'مجمع الملك فهد · ١٤٤٢هـ · ٧٣ ميغابايت' : 'King Fahd Complex · 1442 AH · 73 MB')).toBeOnTheScreen();
    expect(view.queryAllByText(/MB|ميغابايت/)).toHaveLength(1);
  });

  it('shows neither state when no callback is given', async () => {
    const view = await renderUi(<MushafPicker accessibilityLabel="group" onChange={() => undefined} value="hafs" />);

    expect(view.getByText('مجمع الملك فهد · ١٤٤١هـ')).toBeOnTheScreen();
    expect(view.queryByText(/مُنزَّل|ميغابايت/)).toBeNull();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/reader/components/MushafPicker.tsx')).toEqual([]);
  });
});
