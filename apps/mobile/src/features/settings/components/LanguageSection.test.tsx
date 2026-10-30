import { fireEvent } from '@testing-library/react-native';

import { setLocale } from '@/core/i18n';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { LanguageSection } from './LanguageSection';

jest.mock('@/core/i18n', () => {
  const actual = jest.requireActual('@/core/i18n');
  return {
    ...actual,
    setLocale: jest.fn(),
  };
});

describe('LanguageSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders section title and segments for Arabic and English', async () => {
    const view = await renderUi(<LanguageSection />);

    expect(view.getByRole('header', { name: 'اللغة' })).toBeOnTheScreen();
    expect(view.getByRole('tab', { name: 'العربية' })).toBeOnTheScreen();
    expect(view.getByRole('tab', { name: 'English' })).toBeOnTheScreen();
  });

  it('calls setLocale when selecting a new language', async () => {
    const view = await renderUi(<LanguageSection locale="ar" />);

    const enTab = view.getByRole('tab', { name: 'English' });
    fireEvent.press(enTab);

    expect(setLocale).toHaveBeenCalledWith('en');
  });

  it('calls custom onLocaleChange callback when provided', async () => {
    const onLocaleChange = jest.fn();
    const view = await renderUi(<LanguageSection locale="ar" onLocaleChange={onLocaleChange} />);

    const enTab = view.getByRole('tab', { name: 'English' });
    fireEvent.press(enTab);

    expect(onLocaleChange).toHaveBeenCalledWith('en');
    expect(setLocale).not.toHaveBeenCalled();
  });

  it.each(locales)('renders correctly under %s', async (locale) => {
    const view = await renderUi(<LanguageSection locale={locale} />, { locale });

    const expectedHeader = locale === 'en' ? 'Language' : 'اللغة';
    expect(view.getByRole('header', { name: expectedHeader })).toBeOnTheScreen();
    expect(view.getByRole('tab', { name: 'العربية' })).toBeOnTheScreen();
    expect(view.getByRole('tab', { name: 'English' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/settings/components/LanguageSection.tsx')).toEqual([]);
  });
});

