import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { act, fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { storage } from '@/core/storage/mmkv';
import { readDiscoverState, startTour } from '../store';

import { DiscoverTipCard } from './DiscoverTipCard';

beforeEach(() => {
  storage.clearAll();
});

describe('DiscoverTipCard', () => {
  it('renders nothing unless the tour is on its step', async () => {
    const view = await renderUi(<DiscoverTipCard id="reader.mushaf" testID="tip" />, { locale: 'ar' });
    expect(view.queryByTestId('tip')).toBeNull();
    await act(async () => {
      startTour('reader.reading');
    });
    expect(view.queryByTestId('tip')).toBeNull();
  });

  it('a show step explains the screen, with the step count, «التالي» and «تخطي»', async () => {
    await act(async () => {
      startTour('reader.mushaf');
    });
    const view = await renderUi(<DiscoverTipCard id="reader.mushaf" testID="tip" />, { locale: 'ar' });

    expect(view.getByText('عرض المصحف: الصفحات كما في المصحف المطبوع. اسحب لتقليبها.')).toBeOnTheScreen();
    expect(view.getByText('الخطوة ١ من ١٣')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'التالي' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'تخطي' })).toBeOnTheScreen();
  });

  it('«التالي» marks the step done and moves the tour on', async () => {
    await act(async () => {
      startTour('reader.mushaf');
    });
    const view = await renderUi(<DiscoverTipCard id="reader.mushaf" testID="tip" />, { locale: 'ar' });

    await fireEvent.press(view.getByRole('button', { name: 'التالي' }));

    expect(readDiscoverState()).toMatchObject({ done: ['reader.mushaf'], tourStep: 'reader.reading' });
    expect(view.queryByTestId('tip')).toBeNull();
  });

  it('an action step offers only «تخطي», which marks it done and moves on', async () => {
    await act(async () => {
      startTour('listen.follow');
    });
    const view = await renderUi(<DiscoverTipCard id="listen.follow" pointer testID="tip" />, { locale: 'ar' });

    expect(view.queryByRole('button', { name: 'التالي' })).toBeNull();
    expect(view.getByTestId('discover-tip-pointer')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'تخطي' }));

    expect(readDiscoverState()).toMatchObject({ done: ['listen.follow'], tourStep: 'worship.salah' });
  });

  it('✕ ends the tour', async () => {
    await act(async () => {
      startTour('worship.sibha');
    });
    const view = await renderUi(<DiscoverTipCard id="worship.sibha" />, { locale: 'ar' });

    await fireEvent.press(view.getByRole('button', { name: 'إنهاء الجولة' }));

    expect(readDiscoverState().tourStep).toBeNull();
  });

  it('draws the pointer only when asked', async () => {
    await act(async () => {
      startTour('worship.sibha');
    });
    const view = await renderUi(<DiscoverTipCard id="worship.sibha" />, { locale: 'ar' });
    expect(view.queryByTestId('discover-tip-pointer')).toBeNull();
  });

  it.each(locales)('renders its buttons under %s', async (locale) => {
    await act(async () => {
      startTour('app.settings');
    });
    const view = await renderUi(<DiscoverTipCard id="app.settings" />, { locale });
    expect(view.getAllByRole('button')).toHaveLength(3);
  });

  it('has no raw colour literals', () => {
    const source = readFileSync(join(__dirname, 'DiscoverTipCard.tsx'), 'utf8');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});
