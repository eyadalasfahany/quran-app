import { useCallback, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { readAppearance, saveAppearance, themes, useTheme, type Appearance } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

const OPTION_MIN_WIDTH = 64;

const options = ['automatic', 'light', 'sepia', 'dark'] as const satisfies readonly Appearance[];

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

export function ThemePicker({ testID = 'reader-theme-picker' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const appearance = useAppearance();
  const swatch = {
    automatic: theme.colors.fillSecondary,
    light: themes.light.colors.surface,
    sepia: themes.sepia.colors.surface,
    dark: themes.dark.colors.surface,
  } as const;

  return (
    <View accessibilityLabel={t('reader.settings.themeLabel')} style={{ gap: theme.space[3] }} testID={testID}>
      <UiText variant="headline">{t('reader.settings.themeLabel')}</UiText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[3] }}>
        {options.map((option) => {
          const selected = option === appearance;
          const label = t(`reader.settings.themes.${option}`);
          return (
            <Pressable
              key={option}
              accessibilityLabel={label}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => saveAppearance(option)}
              style={{
                alignItems: 'center',
                gap: theme.space[1],
                minHeight: theme.size.touchTarget,
                minWidth: OPTION_MIN_WIDTH,
                paddingVertical: theme.space[1],
              }}
              testID={`reader-theme-${option}`}
            >
              <View
                style={{
                  backgroundColor: swatch[option],
                  borderColor: selected ? theme.colors.brand : colors.line,
                  borderRadius: theme.radius.pill,
                  borderWidth: selected ? theme.stroke.selectedRing : theme.stroke.hairline,
                  height: theme.size.swatch,
                  width: theme.size.swatch,
                }}
                testID={`reader-theme-${option}-swatch`}
              />
              <UiText variant="caption">{label}</UiText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
