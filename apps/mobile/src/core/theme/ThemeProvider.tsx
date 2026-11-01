import type { ThemeName } from '@quran/design-tokens';
import { createContext, use, useMemo, type ReactNode } from 'react';

import { useTextScale } from './useTextScale';
import { themes, withTextScale, type Theme } from './theme';

const ThemeContext = createContext<Theme>(themes.light);

export function ThemeProvider({ name, children }: { name: ThemeName; children: ReactNode }) {
  const factor = useTextScale();
  const value = useMemo(() => withTextScale(themes[name], factor), [name, factor]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): Theme {
  return use(ThemeContext);
}
