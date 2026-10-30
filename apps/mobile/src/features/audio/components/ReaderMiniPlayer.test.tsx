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

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/ReaderMiniPlayer.tsx')).toEqual([]);
  });
});
