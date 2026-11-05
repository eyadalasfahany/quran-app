import { fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';
import type { Locale } from '@/core/i18n';

import { PlayerReciterRow, type PlayerReciterRowState } from './PlayerReciterRow';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: () => createElement(View, {} as ComponentProps<typeof View>) };
});

const colors = themes.dark.colors;
const NAME = 'Mishari Rashid';

// The labels the row composes, per locale (`common.a11yAction` is "{{action}} {{title}}").
const copy: Record<Locale, { download: string; cancel: string; current: string; switchTo: string }> = {
  ar: { download: 'تنزيل', cancel: 'إيقاف التنزيل', current: 'القارئ الحالي', switchTo: 'اضغط للتشغيل بصوته' },
  en: {
    download: 'Download',
    cancel: 'Stop download',
    current: 'current reciter',
    switchTo: 'double-tap to listen in this voice',
  },
};

function labelFor(locale: Locale, action: 'current' | 'switchTo'): string {
  return locale === 'ar' ? `${NAME}، ${copy.ar[action]}` : `${NAME}, ${copy.en[action]}`;
}

type RowProps = ComponentProps<typeof PlayerReciterRow>;

async function renderRow(locale: Locale, state: PlayerReciterRowState, overrides: Partial<RowProps> = {}) {
  const props = {
    name: NAME,
    letter: 'م',
    onCancel: jest.fn(),
    onDownload: jest.fn(),
    onSelect: jest.fn(),
    state,
    statusLabel: null,
    styleLabel: null,
    testID: 'row',
    ...overrides,
  };
  const view = await renderUi(<PlayerReciterRow {...props} />, { locale, theme: 'dark' });
  return { props, view };
}

describe('PlayerReciterRow', () => {
  it.each(locales)('current: a checked radio with the check, the status and no button, in %s', async (locale) => {
    const { props, view } = await renderRow(locale, 'current', {
      playing: true,
      statusLabel: 'يُتلى الآن',
      styleLabel: 'مرتّل',
    });

    const radio = view.getByRole('radio', { name: labelFor(locale, 'current') });
    expect(radio.props.accessibilityState).toEqual({ checked: true });
    expect(view.getByText(NAME)).toBeOnTheScreen();
    expect(view.getByText('مرتّل')).toBeOnTheScreen();
    expect(view.getByText('يُتلى الآن')).toBeOnTheScreen();
    expect(view.getByTestId('row-check', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(view.queryByRole('button')).toBeNull();
    expect(view.queryByRole('progressbar')).toBeNull();

    fireEvent.press(radio);
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it.each(locales)('installed: an unchecked radio that calls onSelect when pressed, in %s', async (locale) => {
    const { props, view } = await renderRow(locale, 'installed', { statusLabel: 'سور محمّلة' });

    const radio = view.getByRole('radio', { name: labelFor(locale, 'switchTo') });
    expect(radio.props.accessibilityState).toEqual({ checked: false });
    expect(view.queryByTestId('row-check', { includeHiddenElements: true })).toBeNull();

    fireEvent.press(radio);
    expect(props.onSelect).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('not downloaded: a 44 pt download button that calls onDownload, in %s', async (locale) => {
    const { props, view } = await renderRow(locale, 'notDownloaded', { statusLabel: 'غير منزّل' });

    const button = view.getByRole('button', { name: `${copy[locale].download} ${NAME}` });
    expect(flatStyle(button.props.style).width).toBe(44);
    expect(flatStyle(button.props.style).height).toBe(44);
    expect(view.queryByRole('radio')).toBeNull();
    expect(view.queryByRole('progressbar')).toBeNull();

    fireEvent.press(button);
    expect(props.onDownload).toHaveBeenCalledTimes(1);
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it.each(locales)('downloading: a progress bar at the percent and a stop button, in %s', async (locale) => {
    const { props, view } = await renderRow(locale, 'downloading', {
      progress: 0.4,
      statusLabel: 'جارٍ التنزيل',
    });

    const bar = view.getByRole('progressbar', { name: NAME });
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
    expect(bar.props.accessibilityState).toMatchObject({ busy: true });
    expect(flatStyle(view.getByTestId('row-progress-fill').props.style).width).toBe('40%');

    const stop = view.getByRole('button', { name: `${copy[locale].cancel} ${NAME}` });
    expect(flatStyle(stop.props.style).width).toBe(44);
    fireEvent.press(stop);
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onDownload).not.toHaveBeenCalled();
  });

  it('clamps the progress to 0 to 100', async () => {
    const { view } = await renderRow('en', 'downloading', { progress: 1.7 });

    expect(view.getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 100 });
  });

  it.each(locales)('unavailable: no button and no radio, disabled, in %s', async (locale) => {
    const { props, view } = await renderRow(locale, 'unavailable', {
      statusLabel: 'غير متوفرة لهذه السورة',
      styleLabel: null,
    });

    expect(view.queryByRole('button')).toBeNull();
    expect(view.queryByRole('radio')).toBeNull();
    const row = view.getByLabelText(NAME);
    expect(row.props.accessibilityState).toEqual({ disabled: true });
    expect(view.getByText('غير متوفرة لهذه السورة')).toBeOnTheScreen();
    expect(view.queryByText('مرتّل')).toBeNull();
    expect(flatStyle(view.getByText(NAME).props.style).color).toBe(colors.playerMuted);

    fireEvent.press(row);
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it('draws the divider in the player line colour, and none on the last row', async () => {
    const shown = await renderUi(<PlayerReciterRow name={NAME} letter="م" onCancel={() => undefined} onDownload={() => undefined} onSelect={() => undefined} state="installed" statusLabel={null} styleLabel={null} testID="row" />, { theme: 'dark' });
    expect(flatStyle(shown.getByTestId('row').props.style)).toMatchObject({
      borderBottomColor: colors.playerLine,
      borderBottomWidth: 1,
    });

    const last = await renderUi(<PlayerReciterRow name={NAME} letter="م" onCancel={() => undefined} onDownload={() => undefined} onSelect={() => undefined} showDivider={false} state="installed" statusLabel={null} styleLabel={null} testID="row" />, { theme: 'dark' });
    expect(flatStyle(last.getByTestId('row').props.style).borderBottomWidth).toBe(0);
  });

  it('keeps every row at least 56 pt tall and every control at least 44 pt', async () => {
    const { view } = await renderRow('en', 'notDownloaded');

    expect(flatStyle(view.getByTestId('row').props.style).minHeight).toBeGreaterThanOrEqual(56);
    const button = view.getByRole('button');
    expect(flatStyle(button.props.style).width).toBeGreaterThanOrEqual(44);
    expect(flatStyle(button.props.style).height).toBeGreaterThanOrEqual(44);
  });

  it('lays the row out in the layout direction, with the check and buttons at the end edge', async () => {
    const { view } = await renderRow('en', 'current', { styleLabel: 'Murattal' });

    expect(flatStyle(view.getByTestId('row').props.style).flexDirection).toBe('row');
    expect(flatStyle(view.getByTestId('row-check', { includeHiddenElements: true }).props.style).height).toBe(22);
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerReciterRow.tsx')).toEqual([]);
  });
});
