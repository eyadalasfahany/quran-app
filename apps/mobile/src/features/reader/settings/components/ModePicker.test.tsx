import * as Haptics from 'expo-haptics';
import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../../jest/feature-ui-source';
import { locales, renderUi } from '../../../../../jest/render-ui';
import { ModePicker } from './ModePicker';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

describe('ModePicker', () => {
  beforeEach(() => {
    jest.mocked(Haptics.selectionAsync).mockClear();
  });

  it.each(locales)('renders every mode in %s', async (locale) => {
    const view = await renderUi(<ModePicker onChange={() => undefined} value="reading" />, { locale });
    expect(view.getByText(locale === 'ar' ? 'مصحف' : 'Mushaf')).toBeOnTheScreen();
    expect(view.getByText(locale === 'ar' ? 'قراءة' : 'Reading')).toBeOnTheScreen();
    expect(view.getByText(locale === 'ar' ? 'تركيز' : 'Focus')).toBeOnTheScreen();
  });

  it('calls haptics when the mode changes', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<ModePicker onChange={onChange} value="reading" />);
    await fireEvent.press(view.getByTestId('reader-mode-picker-focus'));
    expect(onChange).toHaveBeenCalledWith('focus');
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/settings/components/ModePicker.tsx')).toEqual([]);
  });
});
