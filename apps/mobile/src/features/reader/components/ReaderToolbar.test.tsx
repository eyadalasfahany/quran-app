import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { ReaderToolbar } from './ReaderToolbar';

const props = {
  mode: 'mushaf' as const,
  onAyahActions: () => undefined,
  onBack: () => undefined,
  onBookmarkPage: () => undefined,
  onOpenSettings: () => undefined,
  onTogglePanel: () => undefined,
  panelOpen: false,
  subtitle: 'صفحة ١ · الجزء ١',
  title: 'الفاتحة',
  windowClass: 'compact' as const,
};

describe('ReaderToolbar', () => {
  it('shows the panel toggle only on an expanded window', async () => {
    const compact = await renderUi(<ReaderToolbar {...props} />);
    expect(compact.queryByTestId('reader-panel-toggle')).toBeNull();
    expect(compact.getByLabelText('رجوع')).toBeOnTheScreen();
    expect(compact.getByLabelText('حفظ الصفحة')).toBeOnTheScreen();
    expect(compact.getByLabelText('إعدادات القراءة')).toBeOnTheScreen();
    expect(compact.getByLabelText('خيارات الآية')).toBeOnTheScreen();

    const expanded = await renderUi(<ReaderToolbar {...props} panelOpen windowClass="expanded" />);
    expect(expanded.getByTestId('reader-panel-toggle').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('keeps the Mushaf subtitle and the tools group on Mushaf', async () => {
    const view = await renderUi(<ReaderToolbar {...props} />);
    expect(view.getByText('صفحة ١ · الجزء ١')).toBeOnTheScreen();
    expect(view.getByTestId('reader-tools')).toBeOnTheScreen();
  });

  it('shows only Back, the reading subtitle and one settings circle in Reading mode on a phone', async () => {
    const view = await renderUi(<ReaderToolbar {...props} mode="reading" subtitle="صفحة ١ · الجزء ١" />);

    expect(view.getByText('وضع القراءة')).toBeOnTheScreen();
    expect(view.queryByText('صفحة ١ · الجزء ١')).toBeNull();
    expect(view.queryByTestId('reader-tools')).toBeNull();
    expect(view.queryByLabelText('حفظ الصفحة')).toBeNull();
    expect(view.queryByLabelText('خيارات الآية')).toBeNull();
    expect(view.getByTestId('reader-settings').props.accessibilityLabel).toBe('إعدادات القراءة');
    expect(view.getByTestId('reader-settings-glass')).toBeOnTheScreen();
  });

  it('draws the full glass group in Reading mode on an expanded window, in the frame order', async () => {
    const view = await renderUi(<ReaderToolbar {...props} mode="reading" windowClass="expanded" />);

    expect(view.queryByText('وضع القراءة')).toBeNull();
    expect(view.getByText('صفحة ١ · الجزء ١')).toBeOnTheScreen();
    expect(view.queryByTestId('reader-settings-glass')).toBeNull();
    // getAllByLabelText returns the host buttons in tree (render) order.
    const labels = ['حفظ الصفحة', 'إعدادات القراءة', 'خيارات الآية', 'اللوحة الجانبية'];
    const inOrder = view.getAllByLabelText(new RegExp(`^(${labels.join('|')})$`)).map((node) => node.props.accessibilityLabel);
    expect(inOrder).toEqual(labels);
  });

  it('draws the group in Reading mode on a medium window, with no side panel toggle', async () => {
    const view = await renderUi(<ReaderToolbar {...props} mode="reading" windowClass="medium" />);

    expect(view.queryByText('وضع القراءة')).toBeNull();
    expect(view.getByText('صفحة ١ · الجزء ١')).toBeOnTheScreen();
    expect(view.getByTestId('reader-tools')).toBeOnTheScreen();
    expect(view.getByLabelText('حفظ الصفحة')).toBeOnTheScreen();
    expect(view.getByLabelText('إعدادات القراءة')).toBeOnTheScreen();
    expect(view.getByLabelText('خيارات الآية')).toBeOnTheScreen();
    expect(view.queryByTestId('reader-panel-toggle')).toBeNull();
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

  it('shows the full screen button in Mushaf, after the ayah actions, and calls back on press', async () => {
    const onEnterFullscreen = jest.fn();
    const view = await renderUi(<ReaderToolbar {...props} onEnterFullscreen={onEnterFullscreen} />);

    const button = view.getByTestId('reader-fullscreen');
    expect(button.props.accessibilityLabel).toBe('ملء الشاشة');
    expect(button.props.accessibilityRole).toBe('button');
    await fireEvent.press(button);
    expect(onEnterFullscreen).toHaveBeenCalledTimes(1);

    const labels = view.getAllByLabelText(/^(خيارات الآية|ملء الشاشة|اللوحة الجانبية|إعدادات القراءة)$/);
    expect(labels.map((node) => node.props.accessibilityLabel)).toEqual(['إعدادات القراءة', 'خيارات الآية', 'ملء الشاشة']);
  });

  it('draws the full screen button before the side panel toggle on expanded Mushaf', async () => {
    const view = await renderUi(<ReaderToolbar {...props} onEnterFullscreen={() => undefined} windowClass="expanded" />);

    const labels = view.getAllByLabelText(/^(خيارات الآية|ملء الشاشة|اللوحة الجانبية)$/).map((node) => node.props.accessibilityLabel);
    expect(labels).toEqual(['خيارات الآية', 'ملء الشاشة', 'اللوحة الجانبية']);
  });

  it('draws no full screen button in Reading mode', async () => {
    const view = await renderUi(<ReaderToolbar {...props} mode="reading" windowClass="medium" onEnterFullscreen={() => undefined} />);

    expect(view.queryByTestId('reader-fullscreen')).toBeNull();
  });

  it('draws no full screen button without the prop', async () => {
    const view = await renderUi(<ReaderToolbar {...props} />);

    expect(view.queryByTestId('reader-fullscreen')).toBeNull();
  });

  it.each(locales)('labels the full screen button in %s', async (locale) => {
    const view = await renderUi(<ReaderToolbar {...props} onEnterFullscreen={() => undefined} />, { locale });

    expect(view.getByLabelText(locale === 'ar' ? 'ملء الشاشة' : 'Full screen')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/ReaderToolbar.tsx')).toEqual([]);
  });
});
