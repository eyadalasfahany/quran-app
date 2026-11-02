import { fireEvent } from '@testing-library/react-native';

import { themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';

import { OnboardingRadioCard } from './OnboardingRadioCard';

describe('OnboardingRadioCard', () => {
  it.each(locales)('fires onPress as a radio in %s', async (locale) => {
    const onPress = jest.fn();
    const view = await renderUi(
      <OnboardingRadioCard onPress={onPress} selected={false} title="English" />,
      { locale },
    );
    fireEvent.press(view.getByRole('radio'));
    expect(onPress).toHaveBeenCalled();
  });

  it('exposes checked state', async () => {
    const view = await renderUi(<OnboardingRadioCard onPress={() => undefined} selected title="العربية" />);
    expect(view.getByRole('radio').props.accessibilityState?.checked).toBe(true);
  });

  it.each(locales)('shows the subtitle under the title and reads both in %s', async (locale) => {
    const view = await renderUi(
      <OnboardingRadioCard onPress={() => undefined} selected={false} subtitle="الرسم العثماني" title="أميري" />,
      { locale },
    );
    expect(view.getByText('أميري')).toBeTruthy();
    expect(view.getByText('الرسم العثماني')).toBeTruthy();
    expect(view.getByRole('radio', { name: 'أميري, الرسم العثماني' })).toBeTruthy();
  });

  it('labels with the title alone without a subtitle, and keeps an explicit label', async () => {
    const plain = await renderUi(<OnboardingRadioCard onPress={() => undefined} selected={false} title="English" />);
    expect(plain.getByRole('radio', { name: 'English' })).toBeTruthy();
    const labelled = await renderUi(
      <OnboardingRadioCard
        accessibilityLabel="Custom"
        onPress={() => undefined}
        selected={false}
        subtitle="Sub"
        title="English"
      />,
    );
    expect(labelled.getByRole('radio', { name: 'Custom' })).toBeTruthy();
  });

  it('draws the selected ring as a 2 px brand border and gives the pixel back in padding', async () => {
    const view = await renderUi(<OnboardingRadioCard onPress={() => undefined} selected title="English" />);
    const style = flatStyle(view.getByRole('radio').props.style);
    expect(style.borderWidth).toBe(2);
    expect(style.borderColor).toBe(themes.light.colors.brand);
    expect(style.paddingHorizontal).toBe(15);
  });

  it('draws an unselected card with a 1 px border and the regular padding', async () => {
    const view = await renderUi(<OnboardingRadioCard onPress={() => undefined} selected={false} title="English" />);
    const style = flatStyle(view.getByRole('radio').props.style);
    expect(style.borderWidth).toBe(1);
    expect(style.borderColor).not.toBe(themes.light.colors.brand);
    expect(style.paddingHorizontal).toBe(16);
    expect(style.paddingVertical).toBe(0);
  });

  it.each([
    [false, 14, 8],
    [true, 13, 7],
  ])('uses the compact padding (selected %s)', async (selected, horizontal, vertical) => {
    const view = await renderUi(
      <OnboardingRadioCard density="compact" onPress={() => undefined} selected={selected} title="أميري" />,
    );
    const style = flatStyle(view.getByRole('radio').props.style);
    expect(style.paddingHorizontal).toBe(horizontal);
    expect(style.paddingVertical).toBe(vertical);
    expect(style.minHeight).toBe(60);
  });

  it('keeps the trailing caption', async () => {
    const view = await renderUi(
      <OnboardingRadioCard detail="Detail" onPress={() => undefined} selected={false} title="English" />,
    );
    expect(view.getByText('Detail')).toBeTruthy();
  });
});
