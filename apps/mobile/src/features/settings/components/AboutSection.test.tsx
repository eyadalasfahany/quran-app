import { fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { clearLocalUserData } from '@/core/db/user/clear';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { AboutSection } from './AboutSection';

jest.mock('@/core/db/user/clear', () => ({
  clearLocalUserData: jest.fn(),
}));

describe('AboutSection', () => {
  let alertSpy: jest.SpiedFunction<typeof Alert.alert>;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('renders section title and both rows in Arabic', async () => {
    const view = await renderUi(<AboutSection />);

    expect(view.getByRole('header', { name: 'عن التطبيق' })).toBeOnTheScreen();
    expect(view.getByText('المصادر والشكر')).toBeOnTheScreen();
    expect(view.getByText('مسح البيانات المحلية')).toBeOnTheScreen();
  });

  it('calls onPressSources when the sources row is pressed', async () => {
    const onPressSources = jest.fn();
    const view = await renderUi(<AboutSection onPressSources={onPressSources} />);

    fireEvent.press(view.getByTestId('about-sources-row'));

    expect(onPressSources).toHaveBeenCalledTimes(1);
  });

  it('shows a confirmation alert and clears local data when confirmed without a custom handler', async () => {
    const view = await renderUi(<AboutSection />);

    fireEvent.press(view.getByRole('button', { name: 'مسح البيانات المحلية' }));

    expect(alertSpy).toHaveBeenCalledWith(
      'مسح البيانات المحلية؟',
      'هل أنت متأكد من مسح العلامات المحفوظة والتظليلات والملاحظات والختمة؟ لا يمكن التراجع عن هذا الإجراء.',
      expect.any(Array),
    );

    const buttons = alertSpy.mock.calls[0]?.[2] as { text: string; style?: string; onPress?: () => void }[];
    const confirm = buttons.find((button) => button.style === 'destructive');
    confirm?.onPress?.();

    expect(clearLocalUserData).toHaveBeenCalledTimes(1);
  });

  it('calls onClearData when provided and the destructive action is confirmed', async () => {
    const onClearData = jest.fn();
    const view = await renderUi(<AboutSection onClearData={onClearData} />);

    fireEvent.press(view.getByTestId('about-clear-data-row'));

    const buttons = alertSpy.mock.calls[0]?.[2] as { style?: string; onPress?: () => void }[];
    const confirm = buttons.find((button) => button.style === 'destructive');
    confirm?.onPress?.();

    expect(onClearData).toHaveBeenCalledTimes(1);
    expect(clearLocalUserData).not.toHaveBeenCalled();
  });

  it.each(locales)('renders correctly under %s', async (locale) => {
    const view = await renderUi(<AboutSection />, { locale });

    const expectedHeader = locale === 'en' ? 'About' : 'عن التطبيق';
    const expectedClear = locale === 'en' ? 'Clear local data' : 'مسح البيانات المحلية';

    expect(view.getByRole('header', { name: expectedHeader })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: expectedClear })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/settings/components/AboutSection.tsx')).toEqual([]);
  });
});
