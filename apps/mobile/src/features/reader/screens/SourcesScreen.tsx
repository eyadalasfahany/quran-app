import type { Href } from 'expo-router';
import { goBackOr } from '@/core/navigation/go-back';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, View } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { SettingsGroup } from '@/features/settings/components/SettingsGroup';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { ListRow, Screen, UiText } from '@/shared/ui';

const SOURCES = [
  { key: 'qf', url: 'https://quran.foundation' },
  { key: 'tanzil', url: 'https://tanzil.net' },
  { key: 'kfgqpc', url: 'https://qurancomplex.gov.sa' },
  { key: 'opendua', url: 'https://opendua.org/developers', ltr: true },
  { key: 'hadeethenc', url: 'https://hadeethenc.com' },
  { key: 'adhan', url: 'https://github.com/batoulapps/adhan-js' },
  { key: 'fonts', url: 'https://openfontlicense.org' },
] as const;

export function SourcesScreen({ testID }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    // Screen keeps the header below the safe area, as on Settings.
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.space[4] }} testID={testID}>
        {/* The column caps the rows at 720 on wide windows (spec §4). Its gutter is 0: the rows keep their phone layout. */}
        <ContentColumn gutter={0} testID={testID ? `${testID}-column` : undefined}>
          <View style={{ gap: theme.space[4], paddingHorizontal: theme.space[4] }}>
            <SettingsHeader
              onBack={() => goBackOr('/settings' as Href)}
              testID={testID ? `${testID}-header` : undefined}
              title={t('reader.sources.title')}
            />
            <View style={{ gap: theme.space[1] + 2 }}>
              <SettingsGroup testID={testID ? `${testID}-group` : undefined}>
                {SOURCES.map((source, index) => (
                  <ListRow
                    key={source.key}
                    onPress={() => {
                      void Linking.openURL(source.url);
                    }}
                    separator={index < SOURCES.length - 1 ? 'line' : undefined}
                    subtitle={t(`reader.sources.${source.key}.subtitle`)}
                    subtitleDirection={'ltr' in source ? 'ltr' : undefined}
                    testID={testID ? `${testID}-${source.key}` : undefined}
                    title={t(`reader.sources.${source.key}.title`)}
                  />
                ))}
              </SettingsGroup>
              <UiText
                style={{ marginHorizontal: theme.space[1] + 2 }}
                testID={testID ? `${testID}-qf-fonts` : undefined}
                tone="muted"
                variant="caption"
              >
                {t('reader.sources.qfFonts')}
              </UiText>
              {/* suncalc is BSD-2-Clause, so its notice ships with the app (ADR 0043). */}
              <UiText
                style={{ marginHorizontal: theme.space[1] + 2 }}
                testID={testID ? `${testID}-suncalc` : undefined}
                tone="muted"
                variant="caption"
              >
                {t('moon.sources.suncalc')}
              </UiText>
            </View>
          </View>
        </ContentColumn>
      </ScrollView>
    </Screen>
  );
}
