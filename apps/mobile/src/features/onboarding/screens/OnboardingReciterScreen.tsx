import { router, type Href } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { useContentDb } from '@/core/db/content/open';
import { useLocale } from '@/core/i18n/useLocale';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { pause } from '@/features/audio/player';
import { recitationStyleKey, reciterInitial } from '@/features/audio/player-view';
import { isStartingFor, reciterMatch, useStartState } from '@/features/audio/hooks/useIsStarting';
import { playReciter } from '@/features/audio/reciter-playback';
import { reciterDisplayName, type ReciterEntry } from '@/features/audio/reciter-list';
import { setReciterId } from '@/features/audio/settings';
import { useReciterCatalogue } from '@/features/audio/hooks/useReciterCatalogue';
import { completeOnboarding } from '@/features/onboarding/onboarding-state';
import { OnboardingFooter } from '@/features/onboarding/components/OnboardingFooter';
import { OnboardingReciterRow } from '@/features/onboarding/components/OnboardingReciterRow';
import { OnboardingTopBar } from '@/features/onboarding/components/OnboardingTopBar';
import { DailyReminderRow } from '@/features/settings/components/DailyReminderRow';
import { goBackOr } from '@/core/navigation/go-back';
import { Card, Screen, UiText } from '@/shared/ui';

const ONBOARDING_RECITER_COUNT = 4;

function finishOnboarding() {
  completeOnboarding();
  router.replace('/(main)/(home)' as Href);
}

export function OnboardingReciterScreen({ testID = 'onboarding-reciter' }: { testID?: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const { ready } = useContentDb();
  const { reciters, selectedId, playingId } = useReciterCatalogue(ready);
  const startState = useStartState();

  const rows = useMemo(() => reciters.slice(0, ONBOARDING_RECITER_COUNT), [reciters]);

  const renderRow = (item: ReciterEntry) => {
    const name = reciterDisplayName(item, locale, t('listen.unnamed'));
    const styleKey = recitationStyleKey(item.style);
    const playing = item.resourceId === playingId;
    const starting = isStartingFor(startState, reciterMatch(item.resourceId));
    return (
      <OnboardingReciterRow
        key={item.resourceId}
        letter={reciterInitial(name)}
        name={name}
        onPlay={() => {
          if (playing) {
            pause();
            return;
          }
          void playReciter(item.resourceId, item.installed);
        }}
        onSelect={() => setReciterId(item.resourceId)}
        playLabel={playing || starting ? t('player.pause') : t('listen.play', { name })}
        playing={playing}
        starting={starting}
        selected={item.resourceId === selectedId}
        styleLabel={styleKey === null ? null : t(styleKey)}
        testID={`onboarding-reciter-${item.resourceId}`}
      />
    );
  };

  return (
    <Screen testID={testID}>
      {/* The column caps the content at 720 on wide windows (spec §4). Its gutter is 0: the phone layout keeps its own padding. */}
      <ContentColumn gutter={0} testID={`${testID}-column`}>
        <ScrollView
          contentContainerStyle={{
            gap: theme.space[4],
            paddingBottom: theme.space[4],
            paddingHorizontal: theme.space[5],
            paddingTop: theme.space[6],
          }}
          style={{ flex: 1 }}
        >
          <OnboardingTopBar
            backLabel={t('onboarding.back')}
            onBack={() => goBackOr('/(onboarding)/script' as Href)}
            onSkip={finishOnboarding}
            skipLabel={t('onboarding.skip')}
          />
          <View style={{ gap: 6 }}>
            <UiText variant="displayMd">{t('onboarding.reciter.title')}</UiText>
            <UiText tone="muted" variant="subhead">
              {t('onboarding.reciter.subtitle')}
            </UiText>
          </View>
          <View
            accessibilityLabel={t('onboarding.reciter.groupLabel')}
            accessibilityRole="radiogroup"
            style={{ gap: theme.space[2] }}
          >
            {rows.map(renderRow)}
          </View>
          <Card padding={3} testID="onboarding-daily-reminder">
            <DailyReminderRow />
          </Card>
        </ScrollView>
        <OnboardingFooter
          continueLabel={t('onboarding.startReading')}
          onContinue={finishOnboarding}
          step={3}
          stepLabel={t('onboarding.stepOfThree', { step: 3, total: 3 })}
        />
      </ContentColumn>
    </Screen>
  );
}
