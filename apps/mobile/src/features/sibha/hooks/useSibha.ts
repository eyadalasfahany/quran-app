import { useCallback, useState } from 'react';

import { completeHaptic, tapHaptic } from '@/features/azkar/haptics';

import { SIBHA_LABEL_MAX, type SibhaState } from '../data/model';
import { readSibhaState, recordSibhaTap, saveSibhaState } from '../data/store';

export type Sibha = {
  count: number;
  target: number | null;
  label: string;
  /** Counts one tap: a count haptic, and a success haptic on the tap that reaches the target. */
  tap: () => void;
  /** Sets the count back to zero. Today's total is kept. */
  reset: () => void;
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

  const tap = useCallback(() => {
    const result = recordSibhaTap(new Date());
    setState(result.state);
    tapHaptic();
    if (result.reachedTarget) {
      completeHaptic();
    }
  }, []);

  const reset = useCallback(() => {
    commit({ ...readSibhaState(), count: 0 });
  }, [commit]);

  const chooseTarget = useCallback(
    (target: number | null) => {
      commit({ ...readSibhaState(), target });
    },
    [commit],
  );

  const setLabel = useCallback(
    (label: string) => {
      commit({ ...readSibhaState(), label: label.slice(0, SIBHA_LABEL_MAX) });
    },
    [commit],
  );

  return { count: state.count, label: state.label, reset, setLabel, tap, target: state.target, chooseTarget };
}
