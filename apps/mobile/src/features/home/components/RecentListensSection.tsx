import { View } from 'react-native';

import { SkeletonGroup, UiText } from '@/shared/ui';

import { RecentListenRow } from './RecentListenRow';
import { RecentListenRowSkeleton } from './RecentListenRowSkeleton';

// The frame's section gap (quran-app-screens.html, #Main): the heading and each row are 10 apart.
const SECTION_GAP = 10;
// The loading skeleton's two rows, each with its own name length (quran-app-screens.html, #loading).
const SKELETON_NAME_WIDTHS = ['56%', '64%'] as const;

export type RecentListensItem = {
  key: string;
  letter: string;
  name: string;
  subtitle: string;
  playLabel: string;
  /** This listen is playing: its button shows pause. */
  playing?: boolean;
  /** This listen is starting: its button shows pause with the buffering ring. */
  starting?: boolean;
  onPlay: () => void;
};

// «آخر ما استمعت إليه» on Home: a muted heading, then one row per recent listen. Nothing is drawn with no rows (ADR 0017).
// While the content database opens (`loading`), the heading stays and two row skeletons hold the rows' place.
export function RecentListensSection({
  heading,
  items,
  loading = false,
  testID = 'home-recent-listens',
}: {
  heading: string;
  items: readonly RecentListensItem[];
  loading?: boolean;
  testID?: string;
}) {
  if (loading) {
    return (
      <View style={{ gap: SECTION_GAP }} testID={testID}>
        <UiText accessibilityRole="header" tone="muted" variant="headline">
          {heading}
        </UiText>
        <SkeletonGroup style={{ gap: SECTION_GAP }} testID={`${testID}-loading`}>
          {SKELETON_NAME_WIDTHS.map((width) => (
            <RecentListenRowSkeleton key={width} nameWidth={width} />
          ))}
        </SkeletonGroup>
      </View>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: SECTION_GAP }} testID={testID}>
      <UiText accessibilityRole="header" tone="muted" variant="headline">
        {heading}
      </UiText>
      {items.map((item, index) => (
        <RecentListenRow
          filled={index === 0}
          key={item.key}
          letter={item.letter}
          name={item.name}
          onPlay={item.onPlay}
          playLabel={item.playLabel}
          playing={item.playing}
          starting={item.starting}
          subtitle={item.subtitle}
          testID={`${testID}-${item.key}`}
        />
      ))}
    </View>
  );
}
