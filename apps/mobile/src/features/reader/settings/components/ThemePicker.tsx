import { useCallback, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { appearances, readAppearance, saveAppearance, type Appearance } from '@/core/theme';
import { SegmentedControl } from '@/shared/ui';

import { ThemeDot } from './ThemeDot';

function useAppearance(): Appearance {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const listener = storage.addOnValueChangedListener((key) => {
      if (key === storageKeys.appearance) {
        onStoreChange();
      }
    });
    return () => {
      listener.remove();
    };
  }, []);

  return useSyncExternalStore(subscribe, readAppearance, readAppearance);
}

export function ThemePicker({ testID = 'reader-theme' }: { testID?: string }) {
  const { t } = useTranslation();
  const appearance = useAppearance();

  return (
    <SegmentedControl<Appearance>
      label={t('reader.settings.themeLabel')}
      onChange={saveAppearance}
      options={appearances.map((option) => ({
        key: option,
        label: t(`reader.settings.themes.${option}`),
        leading: <ThemeDot appearance={option} />,
      }))}
      testID={testID}
      value={appearance}
    />
  );
}
