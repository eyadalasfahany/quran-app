import { useCallback, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { readAppearance, saveAppearance, themes, useTheme, type Appearance } from '@/core/theme';
import { uiTextProps } from '@/shared/ui';

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
  const appearance = useAppearance();
  const swatch = {
    automatic: theme.colors.fillSecondary,
    light: themes.light.colors.surface,
    sepia: themes.sepia.colors.surface,
    dark: themes.dark.colors.surface,
  } as const;

  return (
    <View accessibilityLabel={t('reader.settings.themeLabel')} style={{ gap: theme.space[3] }} testID={testID}>
      <Text {...uiTextProps('headline')} style={[theme.text.headline, { color: theme.colors.ink }]}>
        {t('reader.settings.themeLabel')}
      </Text>
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
                minHeight: 44,
                minWidth: 64,
                paddingVertical: theme.space[1],
              }}
              testID={`reader-theme-${option}`}
            >
              <View
                style={{
                  backgroundColor: swatch[option],
                  borderColor: selected ? theme.colors.brand : theme.colors.line,
                  borderRadius: theme.radius.pill,
                  borderWidth: selected ? 2 : 1,
                  height: 28,
                  width: 28,
                }}
              />
              <Text {...uiTextProps('caption')} style={[theme.text.caption, { color: theme.colors.ink }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
