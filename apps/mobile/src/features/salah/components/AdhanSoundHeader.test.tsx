import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { AdhanSoundHeader } from './AdhanSoundHeader';

describe('AdhanSoundHeader', () => {
  it('exposes the title as a header', async () => {
    const view = await renderUi(<AdhanSoundHeader onBack={() => undefined} title="صوت الأذان" />);

    expect(view.getByRole('header', { name: 'صوت الأذان' })).toBeOnTheScreen();
  });

  it('calls onBack from the back button, labelled «رجوع»', async () => {
    const onBack = jest.fn();
    const view = await renderUi(<AdhanSoundHeader onBack={onBack} title="صوت الأذان" testID="header" />);

    fireEvent.press(view.getByRole('button', { name: 'رجوع' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('header-back')).toBeOnTheScreen();
  });

  it.each(locales)('labels the back button in %s', async (locale) => {
    const view = await renderUi(<AdhanSoundHeader onBack={() => undefined} title="x" />, { locale });

    expect(view.getByRole('button', { name: locale === 'en' ? 'Back' : 'رجوع' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/salah/components/AdhanSoundHeader.tsx')).toEqual([]);
  });
});
