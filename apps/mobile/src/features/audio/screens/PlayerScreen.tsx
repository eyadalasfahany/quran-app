import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWindowClass } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { READING_COLUMN_MAX } from '@/features/reader/layout';

import { NowPlayingAyah } from '../components/NowPlayingAyah';
import { NowPlayingTitle } from '../components/NowPlayingTitle';
import { PlayerErrorNotice } from '../components/PlayerErrorNotice';
import { PlayerHeader } from '../components/PlayerHeader';
import { PlayerOptionsBar } from '../components/PlayerOptionsBar';
import { PlayerProgress } from '../components/PlayerProgress';
import { PlayerTransport } from '../components/PlayerTransport';
import { ReciterArtwork } from '../components/ReciterArtwork';
import { usePlayerView } from '../hooks/usePlayerView';
import { pause, resume, seek } from '../player';

// Frame padding from the #Player frame: 52 top, 24 sides, 30 bottom. The safe area wins when it is larger.
const FRAME_PADDING_TOP = 52;
const FRAME_PADDING_SIDE = 24;
const FRAME_PADDING_BOTTOM = 30;

// The full player. It composes the audio components and wires them to playerStore; it draws no UI of its own.
export function PlayerScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const windowClass = useWindowClass();
  const view = usePlayerView();

  const togglePlay = () => {
    if (view.isPlaying) {
      pause();
      return;
    }
    void resume();
  };

  return (
    <View style={{ backgroundColor: theme.colors.playerBg, flex: 1 }} testID="player-screen">
      <ScrollView
        testID="player-scroll"
        contentContainerStyle={{
          alignItems: 'center',
          flexGrow: 1,
          paddingBottom: Math.max(insets.bottom, FRAME_PADDING_BOTTOM),
          paddingHorizontal: FRAME_PADDING_SIDE,
          paddingTop: Math.max(insets.top, FRAME_PADDING_TOP),
        }}
      >
        <View
          style={{
            flexGrow: 1,
            gap: 20,
            maxWidth: windowClass === 'expanded' ? READING_COLUMN_MAX : undefined,
            width: '100%',
          }}
        >
          <PlayerHeader onMinimize={() => router.back()} />
          <ReciterArtwork letter={view.artworkLetter} />
          <NowPlayingTitle reciter={view.reciterName} style={view.styleLabel} surah={view.surahName} />
          {view.error === null ? (
            view.ayah === null ? null : <NowPlayingAyah counter={view.ayah.counter} label={view.ayah.label} words={view.ayah.words} />
          ) : (
            <PlayerErrorNotice code={view.error} />
          )}
          <PlayerProgress durationMs={view.durationMs} onSeek={seek} positionMs={view.positionMs} />
          <PlayerTransport
            isPlaying={view.isPlaying}
            onNext={() => undefined}
            onPrevious={() => undefined}
            onTogglePlay={togglePlay}
            stepsEnabled={view.stepsEnabled}
          />
          <View style={{ marginTop: 'auto' }}>
            <PlayerOptionsBar speed={view.speed} versesCount={view.versesCount} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
