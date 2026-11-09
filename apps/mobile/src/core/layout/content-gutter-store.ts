import { space } from '@quran/design-tokens';
import { create } from 'zustand';

// The focused screen's content gutter. The floating notices follow it (ADR 0085). space[6] is the ContentColumn default.
type ContentGutterStore = { gutter: number; setGutter: (gutter: number) => void };

const useContentGutterStore = create<ContentGutterStore>((set) => ({
  gutter: space[6],
  setGutter: (gutter) => set({ gutter }),
}));

export function setContentGutter(value: number) {
  useContentGutterStore.getState().setGutter(value);
}

export function useContentGutter(): number {
  return useContentGutterStore((state) => state.gutter);
}
