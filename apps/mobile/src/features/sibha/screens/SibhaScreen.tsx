import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';
import { AzkarTapSurface } from '@/features/azkar/components/AzkarTapSurface';
import { azkarHref, goBackOr } from '@/features/azkar/routes';
import { Screen } from '@/shared/ui';

import { isPresetTarget, toggleTarget } from '../data/model';
import { useSibha } from '../hooks/useSibha';
import { SibhaCounter } from '../components/SibhaCounter';
import { SibhaCustomTargetSheet } from '../components/SibhaCustomTargetSheet';
import { SibhaHint } from '../components/SibhaHint';
import { SibhaLabelField } from '../components/SibhaLabelField';
import { SibhaTargetChips, type SibhaChoice } from '../components/SibhaTargetChips';
import { SibhaTopBar } from '../components/SibhaTopBar';

/**
 * The misbaha (quran-app-screens.html, #Sibha): a full-screen counter. A tap anywhere that is not a button counts; the
 * top row closes and resets; the chips set the target; the label is the user's own. Reset asks first. No phrase is
 * supplied (ADR 0034 §4). Composition only: the counter, its state and the sheet are in their own files.
 */
export function SibhaScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const sibha = useSibha();
  const [sheetOpen, setSheetOpen] = useState(false);

  const confirmReset = () => {
    Alert.alert(t('sibha.resetTitle'), t('sibha.resetBody'), [
      { style: 'cancel', text: t('common.cancel') },
      { style: 'destructive', text: t('sibha.resetConfirm'), onPress: sibha.reset },
    ]);
  };

  const choose = (choice: SibhaChoice) => {
    if (choice === 'custom') {
      setSheetOpen(true);
      return;
    }
    sibha.chooseTarget(toggleTarget(sibha.target, choice));
  };

  return (
    <Screen testID="screen-sibha">
      <AzkarTapSurface
        onTap={sibha.tap}
        style={{
          flex: 1,
          gap: theme.space[5],
          paddingBottom: insets.bottom + theme.space[4],
          paddingHorizontal: theme.space[4],
          paddingTop: theme.space[3],
        }}
        testID="sibha-tap-surface"
      >
        <SibhaTopBar onClose={() => goBackOr(azkarHref.homeTab)} onReset={confirmReset} />
        <SibhaLabelField onChangeText={sibha.setLabel} value={sibha.label} />
        <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <SibhaCounter count={sibha.count} onReset={confirmReset} onTap={sibha.tap} target={sibha.target} />
        </View>
        <SibhaTargetChips onChoose={choose} target={sibha.target} />
        <SibhaHint />
      </AzkarTapSurface>
      <SibhaCustomTargetSheet
        initialValue={isPresetTarget(sibha.target) ? null : sibha.target}
        onClose={() => setSheetOpen(false)}
        onSave={(value) => {
          sibha.chooseTarget(value);
          setSheetOpen(false);
        }}
        visible={sheetOpen}
      />
    </Screen>
  );
}
