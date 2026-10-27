import type { ReactNode } from 'react';

import { GlassSurface } from './GlassSurface';

// One glass group of IconButtons; a screen edge holds at most one, plus Back (ADR 0012).
// The 2 pt inset matches the drawing; the space scale starts at 4.
export function ToolbarPill({ children, label, testID }: { children: ReactNode; label?: string; testID?: string }) {
  return (
    <GlassSurface
      accessibilityLabel={label}
      accessibilityRole="toolbar"
      radius="pill"
      style={{ alignItems: 'center', flexDirection: 'row', gap: 2, padding: 2 }}
      testID={testID}
    >
      {children}
    </GlassSurface>
  );
}
