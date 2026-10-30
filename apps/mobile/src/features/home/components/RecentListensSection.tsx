import { View } from 'react-native';

import { UiText } from '@/shared/ui';

import { RecentListenRow } from './RecentListenRow';

// The frame's section gap (quran-app-screens.html, #Main): the heading and each row are 10 apart.
const SECTION_GAP = 10;

export type RecentListensItem = {
  key: string;
  letter: string;
  name: string;
  subtitle: string;
  playLabel: string;
  /** This listen is playing: its button shows pause. */
  playing?: boolean;
  onPlay: () => void;
};

// «آخر ما استمعت إليه» on Home: a muted heading, then one row per recent listen. Nothing is drawn with no rows (ADR 0017).
export function RecentListensSection({
  heading,
  items,
  testID = 'home-recent-listens',
}: {
  heading: string;
  items: readonly RecentListensItem[];
  testID?: string;
}) {
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
          subtitle={item.subtitle}
          testID={`${testID}-${item.key}`}
        />
      ))}
    </View>
  );
}
