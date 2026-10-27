import * as Haptics from 'expo-haptics';
import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../../jest/render-ui';
import { FontScaleStepper } from './FontScaleStepper';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

describe('FontScaleStepper', () => {
  beforeEach(() => {
    jest.mocked(Haptics.selectionAsync).mockClear();
  });

  it.each(locales)('shows an Arabic-Indic percentage in Arabic (%s)', async (locale) => {
    const view = await renderUi(
      <FontScaleStepper onChange={() => undefined} previewText="ٱلْحَمْدُ" value={1} />,
      { locale },
    );
    expect(view.getByTestId('reader-font-percent')).toHaveTextContent(locale === 'ar' ? '١٠٠٪' : '100%');
    expect(view.getByTestId('reader-font-preview')).toHaveTextContent('ٱلْحَمْدُ');
    expect(flatStyle(view.getByTestId('reader-font-preview').props.style)).toMatchObject({
      textAlign: 'center',
      writingDirection: 'rtl',
    });
    expect(view.getByTestId('reader-font-decrease')).toHaveTextContent('أ−');
    expect(view.getByTestId('reader-font-increase')).toHaveTextContent('أ+');
    expect(view.getByLabelText(locale === 'ar' ? 'تصغير الخط' : 'Decrease text size')).toBeOnTheScreen();
    expect(view.getByLabelText(locale === 'ar' ? 'تكبير الخط' : 'Increase text size')).toBeOnTheScreen();
  });

  it('steps by a tenth and does not call haptics', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<FontScaleStepper onChange={onChange} value={1} />);
    await fireEvent.press(view.getByTestId('reader-font-increase'));
    expect(onChange).toHaveBeenCalledWith(1.1);
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });

  it('disables the ends of the range', async () => {
    const view = await renderUi(<FontScaleStepper onChange={() => undefined} value={0.8} />);
    expect(view.getByTestId('reader-font-decrease').props.accessibilityState).toEqual({ disabled: true });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/settings/components/FontScaleStepper.tsx')).toEqual([]);
  });
});
