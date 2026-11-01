import { createContext, useContext } from 'react';

// The start-side clearance the tab rail takes in a short window (ADR 0036; tab-bar-clearance.ts). MainShell provides it
// to the tab routes. A screen outside the tabs reads 0, so it keeps its own padding.
export const TabRailContext = createContext(0);

export function useTabRailSideInset(): number {
  return useContext(TabRailContext);
}
