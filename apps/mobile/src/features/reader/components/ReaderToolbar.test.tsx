import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { ReaderToolbar } from './ReaderToolbar';

const props = {
  expanded: false,
  onAyahActions: () => undefined,
  onBack: () => undefined,
  onBookmarkPage: () => undefined,
  onOpenSettings: () => undefined,
  onTogglePanel: () => undefined,
  panelOpen: false,
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
    expect(expanded.getByTestId('reader-panel-toggle').props.accessibilityState).toEqual({ selected: true });
  });

  it.each(locales)('mirrors the back chevron only in Arabic (%s)', async (locale) => {
    const view = await renderUi(<ReaderToolbar {...props} />, { locale });
    const [icon] = view.getByTestId('reader-back').children;
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
