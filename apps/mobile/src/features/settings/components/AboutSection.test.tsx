import { fireEvent, waitFor } from '@testing-library/react-native';

import { clearLocalUserData } from '@/core/db/user/clear';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { AboutSection } from './AboutSection';

jest.mock('@/core/db/user/clear', () => ({
  clearLocalUserData: jest.fn(),
}));

// The dialog fades in, so until its animation ends its elements count as hidden to the query.
const SHOWN = { includeHiddenElements: true } as const;

const CLEAR_TITLE = 'مسح البيانات المحلية؟';
const CLEAR_MESSAGE = 'هل أنت متأكد من مسح العلامات المحفوظة والتظليلات والملاحظات والختمة؟ لا يمكن التراجع عن هذا الإجراء.';

describe('AboutSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    await fireEvent.press(view.getByTestId('about-sources-row'));

    expect(onPressSources).toHaveBeenCalledTimes(1);
  });

  it('asks in the shared dialog before clearing, and does nothing until confirmed', async () => {
    const view = await renderUi(<AboutSection />);

    await fireEvent.press(view.getByRole('button', { name: 'مسح البيانات المحلية' }));

    expect(view.getByText(CLEAR_TITLE, SHOWN)).toBeOnTheScreen();
    expect(view.getByText(CLEAR_MESSAGE, SHOWN)).toBeOnTheScreen();
    expect(view.getByTestId('about-clear-data-dialog-icon-glyph', SHOWN).props.children.props.name).toEqual({
      ios: 'trash',
      android: 'delete_forever',
    });
    expect(clearLocalUserData).not.toHaveBeenCalled();
  });

  it('clears local data when confirmed without a custom handler, and closes the dialog', async () => {
    const view = await renderUi(<AboutSection />);
    await fireEvent.press(view.getByTestId('about-clear-data-row'));

    await fireEvent.press(view.getByRole('button', { name: 'مسح البيانات', ...SHOWN }));

    expect(clearLocalUserData).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(view.queryByText(CLEAR_TITLE, SHOWN)).toBeNull());
  });

  it('closes without clearing when cancelled', async () => {
    const view = await renderUi(<AboutSection />);
    await fireEvent.press(view.getByTestId('about-clear-data-row'));

    await fireEvent.press(view.getByRole('button', { name: 'إلغاء', ...SHOWN }));

    expect(clearLocalUserData).not.toHaveBeenCalled();
    await waitFor(() => expect(view.queryByText(CLEAR_TITLE, SHOWN)).toBeNull());
  });

  it('calls onClearData when provided and the destructive action is confirmed', async () => {
    const onClearData = jest.fn();
    const view = await renderUi(<AboutSection onClearData={onClearData} />);

    await fireEvent.press(view.getByTestId('about-clear-data-row'));
    await fireEvent.press(view.getByRole('button', { name: 'مسح البيانات', ...SHOWN }));

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
