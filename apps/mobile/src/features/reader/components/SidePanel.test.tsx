import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { locales, renderUi } from '../../../../jest/render-ui';
import { SidePanel } from './SidePanel';

describe('SidePanel', () => {
  it.each(locales)('names the panel and its tabs in %s', async (locale) => {
    const view = await renderUi(<SidePanel onClose={() => undefined} onTabChange={() => undefined} tab="actions" />, {
      locale,
    });
    expect(view.getByTestId('reader-side-panel').props.accessibilityLabel).toBe(locale === 'ar' ? 'اللوحة الجانبية' : 'Side panel');
    expect(view.getByTestId('reader-panel-tabs-actions').props.accessibilityState).toEqual({ selected: true });
  });

  it('changes tab and closes', async () => {
    const onTabChange = jest.fn();
    const onClose = jest.fn();
    const view = await renderUi(<SidePanel onClose={onClose} onTabChange={onTabChange} tab="actions" />);
    await fireEvent.press(view.getByTestId('reader-panel-tabs-tafsir'));
    await fireEvent.press(view.getByTestId('reader-panel-close'));
    expect(onTabChange).toHaveBeenCalledWith('tafsir');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/SidePanel.tsx')).toEqual([]);
  });
});
