import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarVariationSwitch } from './AzkarVariationSwitch';

const variations = [
  { key: 'v1', labelIndex: 1, labelEn: null },
  { key: 'v2', labelIndex: 2, labelEn: null },
];

describe('AzkarVariationSwitch', () => {
  it('labels each alternative neutrally with Arabic-Indic numbers', async () => {
    await renderUi(<AzkarVariationSwitch activeVariation="v1" onChange={jest.fn()} variations={variations} />);
    expect(screen.getByText('الصيغة ١')).toBeTruthy();
    expect(screen.getByText('الصيغة ٢')).toBeTruthy();
  });

  it('calls onChange with the chosen alternative key', async () => {
    const onChange = jest.fn();
    await renderUi(<AzkarVariationSwitch activeVariation="v1" onChange={onChange} variations={variations} />);
    await press(screen.getByText('الصيغة ٢'));
    expect(onChange).toHaveBeenCalledWith('v2');
  });

  it('marks the active alternative as selected', async () => {
    await renderUi(<AzkarVariationSwitch activeVariation="v2" onChange={jest.fn()} variations={variations} />);
    expect(screen.getByRole('tab', { name: 'الصيغة ٢' }).props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
  });

  it('uses Western digits and English labels in English', async () => {
    await renderUi(<AzkarVariationSwitch activeVariation="v1" onChange={jest.fn()} variations={variations} />, { locale: 'en' });
    expect(screen.getByText('Wording 1')).toBeTruthy();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarVariationSwitch.tsx')).toEqual([]);
  });
});
