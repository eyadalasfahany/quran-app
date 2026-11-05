import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useReaderMiniCollapse } from '@/features/reader/mini-bar-collapse';

import { MiniPlayerCapsule } from './MiniPlayerCapsule';
import { ReaderMiniBar } from './ReaderMiniBar';
import { ReaderMiniUnavailable } from './ReaderMiniUnavailable';

// The reader's mini element: the bar, or its collapsed capsule. The collapse state is shared through
// useReaderMiniCollapse, so the reader's space follows it (useReaderMiniFootprint). Its own gesture root, because
// the reader screen has none above it. While a surah is unavailable for the reciter (ADR 0062) the expanded bar is
// the notice instead; the capsule is unchanged.
export function ReaderMiniPlayer({
  idle,
  reciterName,
  subtitle,
  playing,
  starting = false,
  fraction,
  onOpen,
  onToggle,
  unavailable,
  notice,
}: {
  idle: boolean;
  reciterName: string;
  subtitle: string;
  playing: boolean;
  /** Audio is starting: the button shows pause with the buffering ring. */
  starting?: boolean;
  fraction: number;
  onOpen: () => void;
  onToggle: () => void;
  unavailable?: { message: string; onChangeReciter: () => void };
  /** The skip notice line under the subtitle, while audio plays (ADR 0062). */
  notice?: string | null;
}) {
  const collapsed = useReaderMiniCollapse((state) => state.collapsed);
  const setCollapsed = useReaderMiniCollapse((state) => state.setCollapsed);

  return (
    <GestureHandlerRootView>
      {collapsed ? (
        <MiniPlayerCapsule fraction={fraction} onExpand={() => setCollapsed(false)} showProgress={!idle} />
      ) : unavailable !== undefined ? (
        <ReaderMiniUnavailable
          message={unavailable.message}
          onChangeReciter={unavailable.onChangeReciter}
          onCollapse={() => setCollapsed(true)}
        />
      ) : (
        <ReaderMiniBar
          fraction={fraction}
          idle={idle}
          onCollapse={() => setCollapsed(true)}
          onOpen={onOpen}
          onToggle={onToggle}
          playing={playing}
          notice={notice}
          reciterName={reciterName}
          starting={starting}
          subtitle={subtitle}
        />
      )}
    </GestureHandlerRootView>
  );
}
