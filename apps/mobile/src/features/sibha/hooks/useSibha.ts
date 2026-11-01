import { useCallback, useRef, useState } from 'react';

import { completeHaptic, tapHaptic } from '@/features/azkar/haptics';

import { resetCount, SIBHA_LABEL_MAX, withTarget, type SibhaState } from '../data/model';
import { readSibhaState, recordSibhaTap, saveSibhaState } from '../data/store';

/**
 * A tap within this many milliseconds of the previous accepted tap is ignored: a double tap counts once, with no
 * second haptic. The same window the Azkar reader uses (a copy, so the misbaha does not import from Azkar's data).
 */
export const SIBHA_TAP_GUARD_MS = 120;

export type Sibha = {
  count: number;
  target: number | null;
  label: string;
  rounds: number;
  /** Counts one tap: a count haptic, and a success haptic on the tap that completes a round. */
  tap: () => void;
  /** Sets the count and the rounds back to zero. Today's total is kept. */
  reset: () => void;
  /** Sets the target (null is «بلا حد»). A change starts the rounds again. */
  chooseTarget: (target: number | null) => void;
  setLabel: (label: string) => void;
};

/**
 * The misbaha's counter, persisted to MMKV on every change. Each write re-reads the saved value first, so a tap and a
 * label edit never overwrite each other.
 */
export function useSibha(): Sibha {
  const [state, setState] = useState<SibhaState>(readSibhaState);

  const commit = useCallback((next: SibhaState) => {
    saveSibhaState(next);
    setState(next);
  }, []);

  // The time of the last accepted tap, for the double-tap guard. Before counting and before the haptic, so a rejected
  // tap changes nothing.
  const lastTapAt = useRef<number | null>(null);

  const tap = useCallback(() => {
    const at = Date.now();
    const previous = lastTapAt.current;
    if (previous !== null && at - previous >= 0 && at - previous < SIBHA_TAP_GUARD_MS) {
      return;
    }
    lastTapAt.current = at;

    const result = recordSibhaTap(new Date(at));
    setState(result.state);
    tapHaptic();
    if (result.reachedTarget) {
      completeHaptic();
    }
  }, []);

  const reset = useCallback(() => {
    commit(resetCount(readSibhaState()));
  }, [commit]);

  const chooseTarget = useCallback(
    (target: number | null) => {
      commit(withTarget(readSibhaState(), target));
    },
    [commit],
  );

  const setLabel = useCallback(
    (label: string) => {
      commit({ ...readSibhaState(), label: label.slice(0, SIBHA_LABEL_MAX) });
    },
    [commit],
  );

  return {
    chooseTarget,
    count: state.count,
    label: state.label,
    reset,
    rounds: state.rounds,
    setLabel,
    tap,
    target: state.target,
  };
}
