import { fireEvent } from '@testing-library/react-native';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { PanelTabs } from './PanelTabs';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

const labels = {
  ar: ['خيارات', 'التفسير', 'الترجمة'],
  en: ['Options', 'Tafsir', 'Translation'],
} as const;

describe('PanelTabs', () => {
  it.each(locales)('names the tab list and its three tabs in %s', async (locale) => {
    const view = await renderUi(<PanelTabs onChange={jest.fn()} testID="tabs" value="actions" />, { locale });

    expect(view.getByTestId('tabs').props.accessibilityRole).toBe('tablist');
    expect(view.getByTestId('tabs').props.accessibilityLabel).toBe(locale === 'ar' ? 'محتوى اللوحة' : 'Panel contents');
    expect(view.getAllByRole('tab').map((tab) => tab.props.accessibilityState)).toEqual([
      { selected: true },
      { selected: false },
      { selected: false },
    ]);
    for (const label of labels[locale]) {
      expect(view.getByRole('tab', { name: label })).toBeOnTheScreen();
    }
  });

  it.each(['actions', 'tafsir', 'translation'] as const)('marks %s as the selected tab', async (tab) => {
    const view = await renderUi(<PanelTabs onChange={jest.fn()} testID="tabs" value={tab} />);

    expect(view.getByTestId(`tabs-${tab}`).props.accessibilityState).toEqual({ selected: true });
    expect(flatStyle(view.getByTestId(`tabs-${tab}`).props.style).backgroundColor).toBe(themes.light.colors.surfaceRaised);
  });

  it('reports the tab the reader picks', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<PanelTabs onChange={onChange} testID="tabs" value="actions" />, { locale: 'en' });

    await fireEvent.press(view.getByRole('tab', { name: 'Translation' }));
    expect(onChange).toHaveBeenCalledWith('translation');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/PanelTabs.tsx')).toEqual([]);
  });
});
