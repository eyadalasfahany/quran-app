import { createContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';

// The opacity every skeleton bar in a SkeletonGroup reads, so the whole group pulses together.
// Null outside a group: a bar then stays at full opacity.
export const SkeletonPulseContext = createContext<SharedValue<number> | null>(null);
