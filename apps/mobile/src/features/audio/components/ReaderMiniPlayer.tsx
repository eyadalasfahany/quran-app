import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useReaderMiniCollapse } from '@/features/reader/mini-bar-collapse';

import { MiniPlayerCapsule } from './MiniPlayerCapsule';
import { ReaderMiniBar } from './ReaderMiniBar';

// The reader's mini element: the bar, or its collapsed capsule. The collapse state is shared through
// useReaderMiniCollapse, so the reader's space follows it (useReaderMiniFootprint). Its own gesture root, because
// the reader screen has none above it.
export function ReaderMiniPlayer({
  idle,
  reciterName,
  subtitle,
  playing,
  starting = false,
  fraction,
  onOpen,
  onToggle,
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
}) {
  const collapsed = useReaderMiniCollapse((state) => state.collapsed);
  const setCollapsed = useReaderMiniCollapse((state) => state.setCollapsed);

  return (
    <GestureHandlerRootView>
      {collapsed ? (
        <MiniPlayerCapsule fraction={fraction} onExpand={() => setCollapsed(false)} showProgress={!idle} />
      ) : (
        <ReaderMiniBar
          fraction={fraction}
          idle={idle}
          onCollapse={() => setCollapsed(true)}
          onOpen={onOpen}
          onToggle={onToggle}
          playing={playing}
          reciterName={reciterName}
          starting={starting}
          subtitle={subtitle}
        />
      )}
    </GestureHandlerRootView>
  );
}
