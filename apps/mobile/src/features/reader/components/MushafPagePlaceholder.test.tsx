import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { MushafPagePlaceholder } from './MushafPagePlaceholder';

describe('MushafPagePlaceholder', () => {
  it('shows the offline message and a reading-mode action', async () => {
    const onSwitch = jest.fn();
    const view = await renderUi(<MushafPagePlaceholder onSwitchToReading={onSwitch} testID="ph" />);

    expect(view.getByRole('header', { name: 'هذه الصفحة غير جاهزة' })).toBeOnTheScreen();
    await fireEvent.press(view.getByRole('button', { name: 'اقرأ في وضع القراءة' }));
    expect(onSwitch).toHaveBeenCalled();
  });

  it('retries the page font from «إعادة المحاولة», and keeps reading mode under it when both are offered', async () => {
    const onRetry = jest.fn();
    const onSwitch = jest.fn();
    const view = await renderUi(<MushafPagePlaceholder onRetry={onRetry} onSwitchToReading={onSwitch} testID="ph" />);

    await fireEvent.press(view.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByRole('button', { name: 'اقرأ في وضع القراءة' }));
    expect(onSwitch).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('offers the retry alone when there is no reading-mode action', async () => {
    const onRetry = jest.fn();
    const view = await renderUi(<MushafPagePlaceholder onRetry={onRetry} />);

    expect(view.getAllByRole('button')).toHaveLength(1);
    await fireEvent.press(view.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('uses the missing-layout copy', async () => {
    const view = await renderUi(<MushafPagePlaceholder variant="missing-layout" />);
    expect(view.getByText('لم تُثبَّت هذه الصفحة بعد. يمكنك قراءة الآية نفسها في وضع القراءة.')).toBeOnTheScreen();
  });

  it.each(locales)('renders localized strings in %s', async (locale) => {
    const view = await renderUi(<MushafPagePlaceholder onSwitchToReading={() => undefined} />, { locale });
    expect(view.getByRole('button')).toBeOnTheScreen();
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/reader/components/MushafPagePlaceholder.tsx')).toEqual([]);
  });
});
