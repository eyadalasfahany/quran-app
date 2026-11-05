import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
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

describe('ReaderMiniPlayer', () => {
  afterEach(() => {
    useReaderMiniCollapse.getState().setCollapsed(false);
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
});
