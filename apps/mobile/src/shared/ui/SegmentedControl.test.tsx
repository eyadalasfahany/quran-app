import { fireEvent, within } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { SEGMENT_GAP, SEGMENT_HIT_SLOP, SEGMENT_MIN_HEIGHT, SegmentedControl } from './SegmentedControl';

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

  it('draws the track in fillTrack with a 4 pt gap and padding', async () => {
    const view = await renderUi(control('tafsir'));

    expect(flatStyle(view.getByTestId('seg').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.fillTrack,
      gap: themes.light.space[1],
      padding: themes.light.space[1],
    });
  });

  it('raises the selected segment in surface-raised with ink semibold text', async () => {
    const view = await renderUi(control('tafsir'));
    const selected = view.getByText('التفسير');

    expect(flatStyle(view.getByTestId('seg-tafsir').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.segmentSelected,
      boxShadow: themes.light.shadows.raised,
    });
    expect(flatStyle(selected.props.style).color).toBe(themes.light.colors.ink);
    expect(flatStyle(selected.props.style).fontFamily).toBe('IBMPlexSansArabic-SemiBold');
    expect(flatStyle(view.getByTestId('seg-actions').props.style).backgroundColor).toBe('transparent');
  });

  it('lifts the selected segment above the track in dark, where a surface-raised fill would be darker', async () => {
    const view = await renderUi(control('tafsir'), { theme: 'dark' });

    expect(flatStyle(view.getByTestId('seg-tafsir').props.style).backgroundColor).toBe(themes.dark.colors.segmentSelected);
    expect(themes.dark.colors.segmentSelected).not.toBe(themes.dark.colors.surfaceRaised);
  });

  it('sets unselected labels in muted ink, medium weight, at subhead size', async () => {
    const view = await renderUi(control('tafsir'));
    const unselected = flatStyle(view.getByText('الخيارات').props.style);

    expect(unselected.color).toBe(themes.light.colors.inkMuted);
    expect(unselected.fontFamily).toBe('IBMPlexSansArabic-Medium');
    expect(unselected.fontSize).toBe(15);
  });

  it('keeps each segment 40 pt tall with a 2 pt top and bottom hit slop, a 44 pt target', async () => {
    const view = await renderUi(control());

    expect(SEGMENT_MIN_HEIGHT + SEGMENT_HIT_SLOP * 2).toBeGreaterThanOrEqual(44);
    for (const tab of view.getAllByRole('tab')) {
      expect(flatStyle(tab.props.style).minHeight).toBe(SEGMENT_MIN_HEIGHT);
      expect(tab.props.hitSlop).toEqual({ bottom: SEGMENT_HIT_SLOP, top: SEGMENT_HIT_SLOP });
    }
  });

  it('renders a leading glyph before the label in a row with a 6 pt gap', async () => {
    const leadingOptions = [
      { key: 'actions', label: 'الخيارات', leading: <Text testID="lead-actions">•</Text> },
      { key: 'tafsir', label: 'التفسير' },
    ] as const;
    const view = await renderUi(
      <SegmentedControl label="لوحة الآية" onChange={() => undefined} options={leadingOptions} testID="seg" value="actions" />,
    );

    const tab = view.getByTestId('seg-actions');
    expect(within(tab).getByTestId('lead-actions')).toBeOnTheScreen();
    expect(flatStyle(tab.props.style)).toMatchObject({ flexDirection: 'row', gap: SEGMENT_GAP });
    expect(view.queryByTestId('lead-tafsir')).toBeNull();
  });

  it('keeps each label on one line that shrinks rather than breaking mid-word', async () => {
    const view = await renderUi(control());

    expect(view.getByText('الخيارات').props).toMatchObject({ adjustsFontSizeToFit: true, numberOfLines: 1 });
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

  it('dims a disabled option, reports it disabled, and never fires onChange or a haptic for it', async () => {
    const onChange = jest.fn();
    const disabledOptions = [
      { key: 'actions', label: 'الخيارات' },
      { key: 'tafsir', label: 'التفسير' },
      { key: 'translation', label: 'الترجمة', disabled: true },
    ] as const;
    const view = await renderUi(
      <SegmentedControl label="لوحة الآية" onChange={onChange} options={disabledOptions} testID="seg" value="actions" />,
    );

    const tab = view.getByRole('tab', { name: 'الترجمة' });
    expect(tab.props.accessibilityState).toMatchObject({ disabled: true, selected: false });
    expect(flatStyle(tab.props.style).opacity).toBe(themes.light.opacity.disabled);

    await fireEvent.press(tab);

    expect(onChange).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });

  it('leaves enabled options without a disabled state', async () => {
    const view = await renderUi(control());

    expect(view.getByRole('tab', { name: 'الخيارات' }).props.accessibilityState).toEqual({ selected: true });
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
