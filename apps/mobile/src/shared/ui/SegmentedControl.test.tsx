import { fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { SegmentedControl } from './SegmentedControl';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

type Tab = 'actions' | 'tafsir' | 'translation';

const options = [
  { key: 'actions', label: 'الخيارات' },
  { key: 'tafsir', label: 'التفسير' },
  { key: 'translation', label: 'الترجمة' },
] as const;

function control(value: Tab = 'actions', onChange: (key: Tab) => void = () => undefined) {
  return <SegmentedControl label="لوحة الآية" onChange={onChange} options={options} testID="seg" value={value} />;
}

describe('SegmentedControl', () => {
  beforeEach(() => {
    jest.mocked(Haptics.selectionAsync).mockClear();
  });

  it('is a labelled tab list with one tab per option', async () => {
    const view = await renderUi(control());

    expect(view.getByTestId('seg').props).toMatchObject({
      accessibilityLabel: 'لوحة الآية',
      accessibilityRole: 'tablist',
    });
    expect(view.getAllByRole('tab')).toHaveLength(3);
  });

  it('marks only the current tab selected', async () => {
    const view = await renderUi(control('tafsir'));

    expect(view.getByRole('tab', { name: 'التفسير' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(view.getByRole('tab', { name: 'الخيارات' }).props.accessibilityState).toMatchObject({ selected: false });
  });

  it('draws the track in fillSecondary and the selected segment raised', async () => {
    const view = await renderUi(control('tafsir'));

    expect(flatStyle(view.getByTestId('seg').props.style).backgroundColor).toBe(themes.light.colors.fillSecondary);
    expect(flatStyle(view.getByTestId('seg-tafsir').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surfaceRaised,
      boxShadow: themes.light.shadows.raised,
    });
    expect(flatStyle(view.getByText('التفسير').props.style).color).toBe(themes.light.colors.brand);
    expect(flatStyle(view.getByTestId('seg-actions').props.style).backgroundColor).toBe('transparent');
  });

  it('gives every segment at least a 44 pt target', async () => {
    const view = await renderUi(control());

    for (const tab of view.getAllByRole('tab')) {
      expect(flatStyle(tab.props.style).minHeight).toBeGreaterThanOrEqual(44);
    }
  });

  it('calls onChange with the key and plays a selection haptic', async () => {
    const onChange = jest.fn();
    const view = await renderUi(control('actions', onChange));

    await fireEvent.press(view.getByRole('tab', { name: 'الترجمة' }));

    expect(onChange).toHaveBeenCalledWith('translation');
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the selected tab is pressed again', async () => {
    const onChange = jest.fn();
    const view = await renderUi(control('actions', onChange));

    await fireEvent.press(view.getByRole('tab', { name: 'الخيارات' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });

  it.each(locales)('lays segments out in a logical row that mirrors in RTL (%s)', async (locale) => {
    const view = await renderUi(control(), { locale });

    expect(flatStyle(view.getByTestId('seg').props.style).flexDirection).toBe('row');
    expect(view.getAllByRole('tab').map((tab) => tab.props.testID)).toEqual([
      'seg-actions',
      'seg-tafsir',
      'seg-translation',
    ]);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('SegmentedControl.tsx')).toEqual([]);
  });
});
