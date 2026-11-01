import { useNow } from '@/features/salah/hooks';
import { useNextPrayerCard } from '../data/next-prayer';

import { NextPrayerCard } from './NextPrayerCard';

// The card shows minutes, so a minute tick is enough (the Salah screen keeps the second-by-second countdown).
export const HOME_PRAYER_TICK_MS = 60_000;

/**
 * Home's next-prayer card with its own clock. The minute tick re-renders this card only, not the whole of Home, which
 * is why the tick lives here rather than in the Home screen.
 */
export function HomeNextPrayer({ onPress, testID }: { onPress: () => void; testID?: string }) {
  const now = useNow(HOME_PRAYER_TICK_MS);
  const card = useNextPrayerCard(now);
  return <NextPrayerCard card={card} onPress={onPress} testID={testID} />;
}
