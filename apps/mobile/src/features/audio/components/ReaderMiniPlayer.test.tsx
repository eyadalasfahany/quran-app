import { act, fireEvent } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { useReaderMiniCollapse } from '@/features/reader/mini-bar-collapse';

import { ReaderMiniPlayer } from './ReaderMiniPlayer';

function element() {
  return (
    <ReaderMiniPlayer
      fraction={0.5}
      idle={false}
      onOpen={jest.fn()}
      onToggle={jest.fn()}
      playing
      reciterName="مشاري راشد العفاسي"
      subtitle="الفاتحة · الآية ٣"
    />
  );
}

function setWindowSize(width: number, height: number) {
  Dimensions.set({ screen: { fontScale: 1, height, scale: 1, width }, window: { fontScale: 1, height, scale: 1, width } });
}

describe('ReaderMiniPlayer', () => {
  afterEach(() => {
    useReaderMiniCollapse.getState().setCollapsed(false);
    useReaderMiniCollapse.getState().setShortOpen(false);
    setWindowSize(390, 844);
  });

  it('draws the bar while expanded', async () => {
    useReaderMiniCollapse.getState().setCollapsed(false);
    const view = await renderUi(element());

    expect(view.getByTestId('mini-player-reader')).toBeOnTheScreen();
    expect(view.queryByTestId('mini-player-capsule')).toBeNull();
  });

  it('draws the capsule while collapsed, and expanding it draws the bar again', async () => {
    useReaderMiniCollapse.getState().setCollapsed(true);
    const view = await renderUi(element());

    expect(view.queryByTestId('mini-player-reader')).toBeNull();
    fireEvent.press(view.getByRole('button', { name: 'إظهار المشغّل' }));
    expect(useReaderMiniCollapse.getState().collapsed).toBe(false);
  });

  it('passes the skip notice line to the bar while expanded (ADR 0062)', async () => {
    useReaderMiniCollapse.getState().setCollapsed(false);
    const view = await renderUi(
      <ReaderMiniPlayer
        fraction={0.5}
        idle={false}
        notice="تخطّي سورة نموذج"
        onOpen={jest.fn()}
        onToggle={jest.fn()}
        playing
        reciterName="مشاري راشد العفاسي"
        subtitle="الفاتحة · الآية ٣"
      />,
    );

    expect(view.getByTestId('mini-player-notice')).toBeOnTheScreen();
  });

  it('draws the unavailable notice in place of the bar while expanded (ADR 0062)', async () => {
    useReaderMiniCollapse.getState().setCollapsed(false);
    const onChangeReciter = jest.fn();
    const view = await renderUi(
      <ReaderMiniPlayer
        fraction={0}
        idle
        onOpen={jest.fn()}
        onToggle={jest.fn()}
        playing={false}
        reciterName="مشاري راشد العفاسي"
        subtitle="الفاتحة"
        unavailable={{ message: 'سورة نموذج غير متوفرة', onChangeReciter }}
      />,
    );

    expect(view.queryByTestId('mini-player-reader')).toBeNull();
    fireEvent.press(view.getByRole('button', { name: 'تغيير القارئ' }));
    expect(onChangeReciter).toHaveBeenCalledTimes(1);
  });

  it('draws the capsule, not the notice, while collapsed', async () => {
    useReaderMiniCollapse.getState().setCollapsed(true);
    const view = await renderUi(
      <ReaderMiniPlayer
        fraction={0}
        idle
        onOpen={jest.fn()}
        onToggle={jest.fn()}
        playing={false}
        reciterName="مشاري راشد العفاسي"
        subtitle="الفاتحة"
        unavailable={{ message: 'سورة نموذج غير متوفرة', onChangeReciter: jest.fn() }}
      />,
    );

    expect(view.getByTestId('mini-player-capsule')).toBeOnTheScreen();
    expect(view.queryByTestId('mini-player-reader-unavailable')).toBeNull();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/ReaderMiniPlayer.tsx')).toEqual([]);
  });

  describe('short window: landscape phone (ADR 0090 amendment, item 8)', () => {
    beforeEach(() => {
      setWindowSize(874, 402);
      useReaderMiniCollapse.getState().setCollapsed(false);
      useReaderMiniCollapse.getState().setShortOpen(false);
    });

    it('starts collapsed even when the saved choice is expanded', async () => {
      const view = await renderUi(element());

      expect(view.queryByTestId('mini-player-reader')).toBeNull();
      expect(view.getByTestId('mini-player-capsule')).toBeOnTheScreen();
      expect(useReaderMiniCollapse.getState().collapsed).toBe(false);
    });

    it.each(['ar', 'en'] as const)('sits the capsule in the bottom trailing corner (%s)', async (locale) => {
      const view = await renderUi(element(), { locale });

      // The dock spans the slot between the edge gutters; flex-end is the end edge, which Yoga mirrors in Arabic.
      expect(flatStyle(view.getByTestId('mini-player-capsule-dock').props.style).alignItems).toBe('flex-end');
    });

    it('tapping the capsule expands the bar, and a hand scroll collapses it again', async () => {
      const view = await renderUi(element());

      await act(async () => fireEvent.press(view.getByRole('button', { name: 'إظهار المشغّل' })));
      expect(view.getByTestId('mini-player-reader')).toBeOnTheScreen();
      expect(useReaderMiniCollapse.getState().collapsed).toBe(false);

      await act(async () => useReaderMiniCollapse.getState().setShortOpen(false));
      expect(view.queryByTestId('mini-player-reader')).toBeNull();
      expect(view.getByTestId('mini-player-capsule')).toBeOnTheScreen();
    });
  });

  describe('tall window', () => {
    it('keeps the capsule centred and does not start it collapsed', async () => {
      setWindowSize(390, 844);
      useReaderMiniCollapse.getState().setCollapsed(false);
      const view = await renderUi(element());

      expect(view.getByTestId('mini-player-reader')).toBeOnTheScreen();
      expect(view.queryByTestId('mini-player-capsule')).toBeNull();
    });

    it('keeps the capsule centred when collapsed', async () => {
      setWindowSize(390, 844);
      useReaderMiniCollapse.getState().setCollapsed(true);
      const view = await renderUi(element());

      expect(flatStyle(view.getByTestId('mini-player-capsule-dock').props.style).alignItems).toBe('center');
    });
  });
});
