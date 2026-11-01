import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWindowClass } from '@/core/layout';
import { useScreenInsets } from '@/core/layout/useScreenInsets';
import { useTheme } from '@/core/theme';
import { READING_COLUMN_MAX } from '@/features/reader/layout';

import { NowPlayingAyah } from '../components/NowPlayingAyah';
import { NowPlayingTitle } from '../components/NowPlayingTitle';
import { PlayerErrorNotice } from '../components/PlayerErrorNotice';
import { PlayerHeader } from '../components/PlayerHeader';
import { PlayerHost } from '../components/PlayerHost';
import { PlayerOptionsBar } from '../components/PlayerOptionsBar';
import { PlayerProgress } from '../components/PlayerProgress';
import { PlayerScrollView } from '../components/PlayerScrollView';
import { PlayerTransport } from '../components/PlayerTransport';
import { ReciterArtwork } from '../components/ReciterArtwork';
import { usePlayerHost } from '../components/player-host-context';
import { usePlayerMeasures, type PlayerPart } from '../hooks/usePlayerMeasures';
import { usePlayerView } from '../hooks/usePlayerView';
import { PLAYER_COLUMN_GAP, fitPlayerColumn } from '../player-fit';
import { nextAyah, pause, previousAyah, resume, seek } from '../player';
import { usePlayerStore } from '../playerStore';

// Frame padding from the #Player frame: 52 top, 24 sides, 30 bottom. The safe area wins when it is larger.
const FRAME_PADDING_TOP = 52;
const FRAME_PADDING_SIDE = 24;
const FRAME_PADDING_BOTTOM = 30;

// The column's fixed parts, in order. The artwork and the ayah card (or the notice in its place) are sized by
// fitPlayerColumn; the card sits between the title and the progress.
const FIXED_PARTS: readonly PlayerPart[] = ['header', 'title', 'progress', 'transport', 'options'];

// The full player. It composes the audio components and wires them to playerStore; it draws no UI of its own.
// The player is hosted by PlayerHost, which slides it up on open and lets a drag close it.
export function PlayerScreen() {
  return (
    <PlayerHost>
      <PlayerBody />
    </PlayerHost>
  );
}

// The player fills the window and never scrolls as a page. The artwork and the ayah card share the room the fixed
// parts leave: the card takes about a fifth of the window, the artwork takes the rest up to its full size, and the
// artwork is hidden when it would be too small. The card scrolls its own text when the ayah is longer than the card.
// Only when even the minimum card does not fit (a very large text size) does the column scroll as a whole. See
// player-fit.ts.
function PlayerBody() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const sides = useScreenInsets();
  const windowClass = useWindowClass();
  const view = usePlayerView();
  const host = usePlayerHost();
  const activeWord = usePlayerStore((state) => state.activeWord);
  const measures = usePlayerMeasures();

  const paddingTop = Math.max(insets.top, FRAME_PADDING_TOP);
  const paddingBottom = Math.max(insets.bottom, FRAME_PADDING_BOTTOM);
  const available = measures.screenHeight === null ? null : measures.screenHeight - paddingTop - paddingBottom;
  // A load error replaces the ayah card; otherwise the card shows once an ayah is active.
  const notice = view.error;
  const ayah = notice === null ? view.ayah : null;
  const fixedParts = notice === null ? FIXED_PARTS : [...FIXED_PARTS, 'notice' as const];
  const fit = fitPlayerColumn({
    available,
    fixedCount: fixedParts.length,
    fixedHeight: measures.sumOf(fixedParts),
    hasCard: ayah !== null,
  });

  const togglePlay = () => {
    if (view.isPlaying) {
      pause();
      return;
    }
    void resume();
  };

  return (
    <View onLayout={measures.onScreenLayout} style={{ backgroundColor: theme.colors.playerBg, flex: 1 }} testID="player-screen">
      <PlayerScrollView
        contentContainerStyle={{
          alignItems: 'center',
          flexGrow: 1,
          paddingBottom,
          paddingEnd: FRAME_PADDING_SIDE + sides.end,
          paddingStart: FRAME_PADDING_SIDE + sides.start,
          paddingTop,
        }}
        scrollEnabled={fit.scrolls}
        testID="player-scroll"
      >
        <View
          style={{
            flexGrow: 1,
            gap: PLAYER_COLUMN_GAP,
            maxWidth: windowClass === 'expanded' ? READING_COLUMN_MAX : undefined,
            width: '100%',
          }}
        >
          <View onLayout={measures.onPartLayout('header')} testID="player-part-header">
            <PlayerHeader onMinimize={host.close} />
          </View>
          {fit.artworkSize !== null ? <ReciterArtwork letter={view.artworkLetter} size={fit.artworkSize} /> : null}
          <View onLayout={measures.onPartLayout('title')} testID="player-part-title">
            <NowPlayingTitle reciter={view.reciterName} style={view.styleLabel} surah={view.surahName} />
          </View>
          {notice !== null ? (
            <View onLayout={measures.onPartLayout('notice')} testID="player-part-notice">
              <PlayerErrorNotice code={notice} />
            </View>
          ) : null}
          {ayah !== null ? (
            <NowPlayingAyah
              activeWord={activeWord}
              counter={ayah.counter}
              label={ayah.label}
              height={fit.cardHeight ?? undefined}
              playing={view.isPlaying}
              words={ayah.words}
            />
          ) : null}
          <View onLayout={measures.onPartLayout('progress')} testID="player-part-progress">
            <PlayerProgress durationMs={view.durationMs} onSeek={seek} positionMs={view.positionMs} />
          </View>
          <View onLayout={measures.onPartLayout('transport')} testID="player-part-transport">
            <PlayerTransport
              isPlaying={view.isPlaying}
              onNext={() => void nextAyah()}
              onPrevious={() => void previousAyah()}
              onTogglePlay={togglePlay}
              stepsEnabled={view.stepsEnabled}
            />
          </View>
          <View onLayout={measures.onPartLayout('options')} style={{ marginTop: 'auto' }} testID="player-part-options">
            <PlayerOptionsBar speed={view.speed} versesCount={view.versesCount} />
          </View>
        </View>
      </PlayerScrollView>
    </View>
  );
}
