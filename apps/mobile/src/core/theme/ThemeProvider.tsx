import type { ThemeName } from '@quran/design-tokens';
import { createContext, use, type ReactNode } from 'react';

import { themes, type Theme } from './theme';

const ThemeContext = createContext<Theme>(themes.light);

export function ThemeProvider({ name, children }: { name: ThemeName; children: ReactNode }) {
  return <ThemeContext value={themes[name]}>{children}</ThemeContext>;
}

export function useTheme(): Theme {
  return use(ThemeContext);
}
