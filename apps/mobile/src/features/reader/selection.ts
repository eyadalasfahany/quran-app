import { create } from 'zustand';

import type { SvgMushafKey } from '@/core/mushaf-pack';

import type { PanelPlacement } from './layout';

export type PanelTab = 'actions' | 'tafsir';

type ReaderSelectionState = {
  verseKey: string | null;
  /** The riwayah whose page the ayah was tapped on; its numbers are that riwayah's own (no map to Hafs yet). */
  riwayah: SvgMushafKey;
  /** The ayah whose sheet is open on a compact or medium window (the /ayah route). */
  sheetVerseKey: string | null;
  panelTab: PanelTab;
  panelOpen: boolean;
  /** Reading mode: tafsir passages show under each ayah in the list. */
  inlineTafsirOpen: boolean;
  selectVerse: (verseKey: string, placement: PanelPlacement, riwayah?: SvgMushafKey) => void;
  setSheetVerseKey: (verseKey: string | null) => void;
  setPanelTab: (panelTab: PanelTab) => void;
  setPanelOpen: (panelOpen: boolean) => void;
  closePanel: () => void;
  toggleInlineTafsir: () => void;
};

const initialSelection = {
  verseKey: null,
  riwayah: 'hafs' as SvgMushafKey,
  sheetVerseKey: null,
  panelTab: 'actions' as const,
  panelOpen: false,
  inlineTafsirOpen: false,
};

export const useReaderSelection = create<ReaderSelectionState>((set) => ({
  ...initialSelection,
  selectVerse: (verseKey, placement, riwayah = 'hafs') => {
    set({ panelOpen: placement !== 'sheet', riwayah, verseKey });
  },
  setSheetVerseKey: (sheetVerseKey) => {
    set({ sheetVerseKey });
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
  toggleInlineTafsir: () => {
    set((state) => ({ inlineTafsirOpen: !state.inlineTafsirOpen }));
  },
}));

/** The ayah the reader has open: the side panel's when docked, the sheet's otherwise. */
export function pressedVerseKey(state: ReaderSelectionState): string | null {
  return state.panelOpen ? state.verseKey : state.sheetVerseKey;
}

export function resetReaderSelection(): void {
  useReaderSelection.setState(initialSelection);
}
