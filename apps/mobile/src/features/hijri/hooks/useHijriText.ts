import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type Options = Record<string, string | number>;

/**
 * Translates keys that are built at run time (an occasion's name, a count). The typed `t` rejects a computed key, so
 * the key is checked here instead and always comes from a fixed list in this feature.
 */
export function useHijriText(): (key: string, options?: Options) => string {
  const { t } = useTranslation();
  return useCallback((key: string, options?: Options) => String(t(key as never, options as never)), [t]);
}
