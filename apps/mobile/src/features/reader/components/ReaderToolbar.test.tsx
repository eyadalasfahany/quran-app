import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { ReaderToolbar } from './ReaderToolbar';

const props = {
  expanded: false,
  mode: 'mushaf' as const,
  onAyahActions: () => undefined,
  onBack: () => undefined,
  onBookmarkPage: () => undefined,
  onOpenSettings: () => undefined,
  onTogglePanel: () => undefined,
  panelOpen: false,
  subtitle: 'صفحة ١ · الجزء ١',
  title: 'الفاتحة',
};

describe('ReaderToolbar', () => {
  it('shows the panel toggle only on an expanded window', async () => {
    const compact = await renderUi(<ReaderToolbar {...props} />);
    expect(compact.queryByTestId('reader-panel-toggle')).toBeNull();
    expect(compact.getByLabelText('رجوع')).toBeOnTheScreen();
    expect(compact.getByLabelText('حفظ الصفحة')).toBeOnTheScreen();
    expect(compact.getByLabelText('إعدادات القراءة')).toBeOnTheScreen();
    expect(compact.getByLabelText('خيارات الآية')).toBeOnTheScreen();

    const expanded = await renderUi(<ReaderToolbar {...props} expanded panelOpen />);
    expect(expanded.getByTestId('reader-panel-toggle').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('keeps the Mushaf subtitle and the tools group on Mushaf', async () => {
    const view = await renderUi(<ReaderToolbar {...props} />);
    expect(view.getByText('صفحة ١ · الجزء ١')).toBeOnTheScreen();
    expect(view.getByTestId('reader-tools')).toBeOnTheScreen();
  });

  it('shows only Back, the reading subtitle and one settings circle in Reading mode', async () => {
    const view = await renderUi(<ReaderToolbar {...props} mode="reading" subtitle="صفحة ١ · الجزء ١" />);

    expect(view.getByText('وضع القراءة')).toBeOnTheScreen();
    expect(view.queryByText('صفحة ١ · الجزء ١')).toBeNull();
    expect(view.queryByTestId('reader-tools')).toBeNull();
    expect(view.queryByLabelText('حفظ الصفحة')).toBeNull();
    expect(view.queryByLabelText('خيارات الآية')).toBeNull();
    expect(view.getByTestId('reader-settings').props.accessibilityLabel).toBe('إعدادات القراءة');
    expect(view.getByTestId('reader-settings-glass')).toBeOnTheScreen();
  });

  it('keeps the panel toggle beside settings in Reading mode on an expanded window', async () => {
    const view = await renderUi(<ReaderToolbar {...props} expanded mode="reading" />);

    expect(view.getByTestId('reader-tools')).toBeOnTheScreen();
    expect(view.getByLabelText('إعدادات القراءة')).toBeOnTheScreen();
    expect(view.getByTestId('reader-panel-toggle')).toBeOnTheScreen();
    expect(view.queryByLabelText('حفظ الصفحة')).toBeNull();
    expect(view.queryByLabelText('خيارات الآية')).toBeNull();
  });

  it.each(locales)('opens reading settings from the Reading mode circle (%s)', async (locale) => {
    const onOpenSettings = jest.fn();
    const view = await renderUi(
      <ReaderToolbar {...props} mode="reading" onOpenSettings={onOpenSettings} />,
      { locale },
    );
    await fireEvent.press(view.getByTestId('reader-settings'));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('points Back toward the leading edge: left in English, mirrored right in Arabic (%s)', async (locale) => {
    const view = await renderUi(<ReaderToolbar {...props} />, { locale });
    const icon = view.getByTestId('reader-back').children.at(-1);
    const [symbol] = typeof icon === 'object' ? icon.children : [];
    expect(typeof symbol === 'object' ? symbol.props.name : undefined).toBe('chevron.left');
    expect(flatStyle(typeof icon === 'object' ? icon.props.style : undefined).transform).toEqual(
      locale === 'ar' ? [{ scaleX: -1 }] : undefined,
    );
  });

  it('calls back', async () => {
    const onBack = jest.fn();
    const view = await renderUi(<ReaderToolbar {...props} onBack={onBack} />);
    await fireEvent.press(view.getByTestId('reader-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/ReaderToolbar.tsx')).toEqual([]);
  });
});
