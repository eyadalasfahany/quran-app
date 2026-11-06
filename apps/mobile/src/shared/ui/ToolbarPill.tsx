import type { ReactNode } from 'react';

import { GlassSurface } from './GlassSurface';

// The 2 pt inset matches the drawing; the space scale starts at 4. Screens use it to line up a button with the pill edge.
export const TOOLBAR_PILL_INSET = 2;

// One glass group of IconButtons; a screen edge holds at most one, plus Back (ADR 0012).
export function ToolbarPill({ children, label, testID }: { children: ReactNode; label?: string; testID?: string }) {
  return (
    <GlassSurface
      accessibilityLabel={label}
      accessibilityRole="toolbar"
      radius="pill"
      style={{ alignItems: 'center', flexDirection: 'row', gap: TOOLBAR_PILL_INSET, padding: TOOLBAR_PILL_INSET }}
      testID={testID}
    >
      {children}
    </GlassSurface>
  );
}
