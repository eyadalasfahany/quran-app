import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWindowClass } from '@/core/layout';
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

// The column's fixed parts, in order. The ayah card (or the notice in its place) sits between the title and the progress.
const FIXED_PARTS: readonly PlayerPart[] = ['header', 'artwork', 'title', 'progress', 'transport', 'options'];

// The full player. It composes the audio components and wires them to playerStore; it draws no UI of its own.
// The player is hosted by PlayerHost, which slides it up on open and lets a drag close it.
export function PlayerScreen() {
  return (
    <PlayerHost>
      <PlayerBody />
    </PlayerHost>
  );
}

// The player fills the window and never scrolls as a page while the ayah fits. A long ayah takes the room left after
// the fixed parts and scrolls its own text. Only when that room cannot hold two lines of Quran text (a very large
// text size) does the column scroll: by the few points the minimum overflows, or as a whole when the fixed parts alone
// do not fit, with the card at its natural height so nothing is clipped. See player-fit.ts.
function PlayerBody() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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
    cardNatural: ayah === null ? undefined : measures.cardNatural,
    childCount: FIXED_PARTS.length + (notice !== null || ayah !== null ? 1 : 0),
    fixedHeight: measures.sumOf(fixedParts),
  });
  const cardRoom = fit.cardFill ?? undefined;

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
          paddingHorizontal: FRAME_PADDING_SIDE,
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
          <View onLayout={measures.onPartLayout('artwork')} testID="player-part-artwork">
            <ReciterArtwork letter={view.artworkLetter} />
          </View>
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
              maxHeight={cardRoom}
              onNaturalHeight={measures.onCardNatural}
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
