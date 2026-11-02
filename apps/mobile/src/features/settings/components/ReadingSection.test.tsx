import { cleanup, fireEvent } from '@testing-library/react-native';

import { i18n } from '@/core/i18n';
import { readDarkAfterMaghrib, saveDarkAfterMaghrib } from '@/core/theme/appearance';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { ReadingSection } from './ReadingSection';

jest.mock('@/core/theme/appearance', () => {
  const actual = jest.requireActual('@/core/theme/appearance');
  return {
    ...actual,
    readDarkAfterMaghrib: jest.fn(() => false),
    saveDarkAfterMaghrib: jest.fn(),
  };
});

describe('ReadingSection', () => {
  beforeEach(() => {
    jest.mocked(readDarkAfterMaghrib).mockReturnValue(false);
    jest.mocked(saveDarkAfterMaghrib).mockClear();
  });

  afterEach(async () => {
    cleanup();
    await i18n.changeLanguage('ar');
  });

  it.each([
    ['ar', 'شهرزاد'],
    ['en', 'Scheherazade'],
  ] as const)('shows the chosen Quran font as the font row value (%s)', async (locale, name) => {
    const view = await renderUi(<ReadingSection fontValue={name} />, { locale });
    expect(view.getByText(name)).toBeOnTheScreen();
  });

  it('renders section title and reading rows with default values', async () => {
    const view = await renderUi(<ReadingSection />);

    expect(view.getByRole('header', { name: 'القراءة' })).toBeOnTheScreen();
    expect(view.getByText('خط المصحف')).toBeOnTheScreen();
    expect(view.getByText('أميري')).toBeOnTheScreen();
    expect(view.getByText('طريقة العرض والمظهر')).toBeOnTheScreen();
    expect(view.getByText('مصحف · تلقائي')).toBeOnTheScreen();
    expect(view.getByText('الوضع الداكن تلقائيًا بعد المغرب')).toBeOnTheScreen();
    expect(view.getByText('التفسير الافتراضي')).toBeOnTheScreen();
    expect(view.getByText('التفسير الميسر')).toBeOnTheScreen();
  });

  it('fires navigation callbacks on tapping rows', async () => {
    const onPressFont = jest.fn();
    const onPressAppearance = jest.fn();
    const onPressTafsir = jest.fn();

    const view = await renderUi(
      <ReadingSection
        onPressAppearance={onPressAppearance}
        onPressQuranFont={onPressFont}
        onPressTafsir={onPressTafsir}
      />,
    );

    await fireEvent.press(view.getByTestId('reading-font-row'));
    expect(onPressFont).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByTestId('reading-appearance-row'));
    expect(onPressAppearance).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByTestId('reading-tafsir-row'));
    expect(onPressTafsir).toHaveBeenCalledTimes(1);
  });

  it('toggles auto dark mode after Maghrib', async () => {
    const view = await renderUi(<ReadingSection />);

    const toggle = view.getByTestId('dark-after-maghrib-toggle');
    expect(toggle.props.accessibilityState.checked).toBe(false);

    fireEvent(toggle, 'valueChange', true);
    expect(saveDarkAfterMaghrib).toHaveBeenCalledWith(true);
  });

  it('calls custom onDarkAfterMaghribChange callback when provided', async () => {
    const onToggle = jest.fn();
    const view = await renderUi(<ReadingSection darkAfterMaghrib={false} onDarkAfterMaghribChange={onToggle} />);

    fireEvent(view.getByTestId('dark-after-maghrib-toggle'), 'valueChange', true);

    expect(onToggle).toHaveBeenCalledWith(true);
    expect(saveDarkAfterMaghrib).not.toHaveBeenCalled();
  });

  it.each(locales)('renders correctly under %s', async (locale) => {
    const view = await renderUi(<ReadingSection />, { locale });

    const expectedHeader = locale === 'en' ? 'Reading' : 'القراءة';
    const expectedFont = locale === 'en' ? 'Quran font' : 'خط المصحف';
    const expectedAppearance = locale === 'en' ? 'Reading mode and appearance' : 'طريقة العرض والمظهر';
    const expectedDark = locale === 'en' ? 'Dark mode automatically after Maghrib' : 'الوضع الداكن تلقائيًا بعد المغرب';
    const expectedTafsir = locale === 'en' ? 'Default tafsir' : 'التفسير الافتراضي';

    expect(view.getByRole('header', { name: expectedHeader })).toBeOnTheScreen();
    expect(view.getByText(expectedFont)).toBeOnTheScreen();
    expect(view.getByText(expectedAppearance)).toBeOnTheScreen();
    expect(view.getByText(expectedDark)).toBeOnTheScreen();
    expect(view.getByText(expectedTafsir)).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/settings/components/ReadingSection.tsx')).toEqual([]);
  });
});

