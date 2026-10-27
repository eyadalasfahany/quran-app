import { create } from 'zustand';

import type { PanelPlacement } from './layout';

export type PanelTab = 'actions' | 'tafsir' | 'translation';

type ReaderSelectionState = {
  verseKey: string | null;
  panelTab: PanelTab;
  panelOpen: boolean;
  selectVerse: (verseKey: string, placement: PanelPlacement) => void;
  setPanelTab: (panelTab: PanelTab) => void;
  setPanelOpen: (panelOpen: boolean) => void;
  closePanel: () => void;
};

const initialSelection = {
  verseKey: null,
  panelTab: 'actions' as const,
  panelOpen: false,
};

export const useReaderSelection = create<ReaderSelectionState>((set) => ({
  ...initialSelection,
  selectVerse: (verseKey, placement) => {
    set({ panelOpen: placement !== 'sheet', verseKey });
  },
  setPanelTab: (panelTab) => {
    set({ panelTab });
  },
  setPanelOpen: (panelOpen) => {
    set({ panelOpen });
  },
  closePanel: () => {
    set({ panelOpen: false });
  },
}));

export function resetReaderSelection(): void {
  useReaderSelection.setState(initialSelection);
}
