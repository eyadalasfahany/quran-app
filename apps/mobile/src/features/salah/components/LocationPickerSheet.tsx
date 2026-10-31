import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { Icon, SearchField, SheetHeader, UiText, type IconName } from '@/shared/ui';

import { searchCities, type City } from '../data/cities';

const LOCATE: IconName = { ios: 'location', android: 'my_location' };
const CHECK: IconName = { ios: 'checkmark', android: 'check' };

/**
 * The location sheet behind the header's map-pin button: switch back to automatic GPS or
 * search the bundled gazetteer for a manual city (ADR 0030 D5). A plain RN Modal — the salah
 * tab is never itself a native modal, unlike the player.
 */
export function LocationPickerSheet({
  visible,
  source,
  cityId,
  permissionDenied,
  onClose,
  onSelectAuto,
  onSelectCity,
  testID = 'salah-location-sheet',
}: {
  visible: boolean;
  source: 'auto' | 'manual';
  cityId?: string;
  /** Show the guidance note when the system permission was denied. */
  permissionDenied?: boolean;
  onClose: () => void;
  onSelectAuto: () => void;
  onSelectCity: (city: City) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const results = useMemo(() => searchCities(query), [query]);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={{ backgroundColor: theme.colors.scrim, flex: 1, justifyContent: 'flex-end' }} testID={testID}>
        {/* Tap-to-dismiss scrim: not itself focusable — VoiceOver users get the sheet's close button. */}
        <Pressable accessible={false} onPress={onClose} style={{ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }} testID={`${testID}-backdrop`} />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: theme.colors.surfacePage,
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg,
            gap: theme.space[3],
            paddingBottom: Math.max(insets.bottom, theme.space[4]),
            paddingHorizontal: theme.space[4],
            paddingTop: theme.space[3],
          }}
        >
          <SheetHeader closeLabel={t('salah.location.close')} closeTone="track" onClose={onClose} testID={`${testID}-header`} title={t('salah.location.title')} />
          <Pressable
            accessibilityLabel={t('salah.location.auto')}
            accessibilityRole="button"
            accessibilityState={{ selected: source === 'auto' }}
            onPress={onSelectAuto}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: pressed ? theme.colors.glassSelected : 'transparent',
              borderRadius: theme.radius.md,
              flexDirection: 'row',
              gap: theme.space[3],
              paddingVertical: theme.space[2],
            })}
            testID={`${testID}-auto`}
          >
            <Icon color={theme.colors.brand} name={LOCATE} />
            <View style={{ flex: 1, gap: 2 }}>
              <UiText variant="headline">{t('salah.location.auto')}</UiText>
              <UiText tone="muted" variant="caption">
                {t('salah.location.autoHint')}
              </UiText>
            </View>
            {source === 'auto' ? <Icon color={theme.colors.brand} name={CHECK} testID={`${testID}-auto-check`} /> : null}
          </Pressable>
          {permissionDenied ? (
            <UiText testID={`${testID}-denied`} tone="danger" variant="caption">
              {t('salah.location.permissionDenied')}
            </UiText>
          ) : null}
          <SearchField
            onChangeText={setQuery}
            onSubmit={() => undefined}
            placeholder={t('salah.location.searchPlaceholder')}
            testID={`${testID}-search`}
            value={query}
          />
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 320 }} testID={`${testID}-results`}>
            {results.map((city) => {
              const selected = source === 'manual' && city.id === cityId;
              const country = locale === 'ar' ? city.country_ar : city.country_en;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={city.id}
                  onPress={() => onSelectCity(city)}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    backgroundColor: pressed ? theme.colors.glassSelected : 'transparent',
                    borderRadius: theme.radius.md,
                    flexDirection: 'row',
                    gap: theme.space[3],
                    minHeight: theme.size.touchTarget,
                  })}
                  testID={`${testID}-city-${city.id}`}
                >
                  <UiText style={{ flex: 1 }} variant="body">
                    {locale === 'ar' ? city.ar : city.en}
                  </UiText>
                  {country ? (
                    <UiText tone="muted" variant="caption">
                      {country}
                    </UiText>
                  ) : null}
                  {selected ? <Icon color={theme.colors.brand} name={CHECK} testID={`${testID}-city-${city.id}-check`} /> : null}
                </Pressable>
              );
            })}
            {query.length > 0 && results.length === 0 ? (
              <UiText style={{ paddingVertical: theme.space[3] }} testID={`${testID}-empty`} tone="muted" variant="subhead">
                {t('salah.location.noResults')}
              </UiText>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
