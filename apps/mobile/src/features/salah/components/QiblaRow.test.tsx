import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';

import { QiblaRow } from './QiblaRow';

describe('QiblaRow', () => {
  it('shows the rounded bearing from true north in Arabic-Indic digits', async () => {
    const view = await renderUi(<QiblaRow bearing={243.6} onPress={() => undefined} />);

    expect(view.getByTestId('salah-qibla-subtitle')).toHaveTextContent('٢٤٤° من الشمال الحقيقي');
  });

  it('shows the bearing in English', async () => {
    const view = await renderUi(<QiblaRow bearing={118.96} onPress={() => undefined} />, { locale: 'en' });

    expect(view.getByTestId('salah-qibla-subtitle')).toHaveTextContent('119° from true north');
  });

  it.each(locales)('navigates on press with an accessible name (%s)', async (locale) => {
    const onPress = jest.fn();
    const view = await renderUi(<QiblaRow bearing={244} onPress={onPress} />, { locale });

    const row = view.getByTestId('salah-qibla');
    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityLabel).toBe(locale === 'ar' ? 'اتجاه القبلة' : 'Qibla direction');

    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
