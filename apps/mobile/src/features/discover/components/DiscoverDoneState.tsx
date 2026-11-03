import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button, Icon, UiText, useContrastColors, type IconName } from '@/shared/ui';

import { DiscoverProgressBar } from './DiscoverProgressBar';

const CHECK: IconName = { ios: 'checkmark', android: 'check' };

/** The short «أحسنت» state once every row is done. «تم» acknowledges the set, and the card goes away (ADR 0053 §4). */
export function DiscoverDoneState({ done, total, onFinish }: { done: number; total: number; onFinish: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View style={{ gap: theme.space[3] }} testID="discover-done-state">
      <View style={{ alignItems: 'center', gap: theme.space[2] }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: theme.colors.brand,
            borderRadius: 22,
            height: 44,
            justifyContent: 'center',
            width: 44,
          }}
        >
          <Icon color={colors.onBrand} name={CHECK} size={22} />
        </View>
        <UiText accessibilityRole="header" variant="displayMd">
          {t('discover.done.title')}
        </UiText>
        <UiText tone="muted" variant="body" style={{ textAlign: 'center' }}>
          {t('discover.done.body')}
        </UiText>
      </View>
      <DiscoverProgressBar done={done} total={total} />
      <Button label={t('discover.done.action')} onPress={onFinish} stretch variant="primary" />
    </View>
  );
}
