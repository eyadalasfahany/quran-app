import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { useAzkarAvailable } from '@/features/azkar/data';
import { SheetFrame } from '@/features/reader/components/SheetFrame';
import { SheetHost } from '@/features/reader/components/SheetHost';
import { SheetScrollView } from '@/features/reader/components/SheetScrollView';
import { useSheet } from '@/features/reader/components/sheet-context';
import { SheetHeader } from '@/shared/ui';

import { RecommendedRemindersContent } from '../components/RecommendedRemindersContent';
import { ReminderPermissionDialog } from '../components/ReminderPermissionDialog';
import { applyRecommendedSet, markRecommendedSetShown } from '../data/recommended';

/**
 * The recommended-set sheet (`/reminders/recommended`; ADR 0034 amendment, 2 Nov 2026). Opened by the hub's first visit,
 * over the hub. The primary button turns the set on and closes the sheet; «اختيار بنفسي» closes it and leaves the hub as it is.
 * A refused permission keeps the sheet open with the device-settings notice.
 */
export function RecommendedRemindersScreen({ testID = 'recommended-reminders-sheet' }: { testID?: string }) {
  return (
    <SheetHost testID={testID}>
      <RecommendedRemindersCard />
    </SheetHost>
  );
}

/**
 * The sheet's content. It reads the sheet context, so it must sit inside SheetHost; the screen above only hosts it.
 * (Read in the screen itself, the context is null and close does nothing.)
 */
function RecommendedRemindersCard() {
  const { t } = useTranslation();
  const theme = useTheme();
  const sheet = useSheet();
  const hasAzkar = useAzkarAvailable();
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  const accept = () => {
    if (busy) {
      return;
    }
    setBusy(true);
    void applyRecommendedSet({ hasAzkar }).then((applied) => {
      setBusy(false);
      if (applied) {
        sheet?.close();
      } else {
        setDenied(true);
      }
    });
  };

  const choose = () => {
    markRecommendedSetShown();
    sheet?.close();
  };

  return (
    <>
      <SheetFrame testID="recommended-reminders-frame">
        <View style={{ flex: 1, gap: theme.space[4], paddingHorizontal: theme.space[4] }}>
          <SheetHeader
            closeLabel={t('azkar.reader.close')}
            onClose={() => sheet?.close()}
            size="large"
            testID="recommended-reminders-header"
            title={t('reminders.recommended.title')}
          />
          <SheetScrollView>
            <View style={{ paddingBottom: theme.space[8] }}>
              <RecommendedRemindersContent hasAzkar={hasAzkar} onAccept={accept} onChoose={choose} />
            </View>
          </SheetScrollView>
        </View>
      </SheetFrame>
      <ReminderPermissionDialog onClose={() => setDenied(false)} visible={denied} />
    </>
  );
}
