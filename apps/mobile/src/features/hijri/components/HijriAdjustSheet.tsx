import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { View } from 'react-native';

import { formatHijriDate } from '@/core/i18n/dates';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { SheetFrame } from '@/features/reader/components/SheetFrame';
import { SheetHost } from '@/features/reader/components/SheetHost';
import { SheetScrollView } from '@/features/reader/components/SheetScrollView';
import { Button, Card, ListRow, SegmentedControl, SheetHeader, UiText } from '@/shared/ui';

import { formatSignedDays } from '../data/labels';
import { ADJUST_MAX, ADJUST_MIN, clampAdjustDays } from '../data/hijri-date';
import { useHijriAdjustment } from '../data/adjustment';

const OPTIONS = Array.from({ length: ADJUST_MAX - ADJUST_MIN + 1 }, (_, index) => ADJUST_MIN + index);

/**
 * The Hijri adjustment sheet (screens/, #HijriAdjust; route `/hijri/adjust`). A −2…+2 segment, the
 * before and after dates, and save or reset. Saving writes MMKV, so every Hijri surface updates (ADR 0048, decision 2).
 */
export function HijriAdjustSheet({ onClose, testID = 'hijri-adjust-sheet' }: { onClose: () => void; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const [saved, setSaved] = useHijriAdjustment();
  const [draft, setDraft] = useState(saved);
  const [now] = useState(() => new Date());

  const save = () => {
    setSaved(draft);
    onClose();
  };

  return (
    <SheetHost testID={testID}>
      <SheetFrame testID={`${testID}-frame`}>
        <View style={{ flex: 1, gap: theme.space[4], paddingHorizontal: theme.space[4] }}>
          <SheetHeader
            closeLabel={t('hijri.adjust.close')}
            onClose={onClose}
            size="large"
            testID={`${testID}-header`}
            title={t('hijri.adjust.title')}
          />
          <SheetScrollView>
            <View style={{ gap: theme.space[4], paddingBottom: theme.space[8] }}>
              <UiText testID={`${testID}-body`} tone="muted" variant="body">
                {t('hijri.adjust.body')}
              </UiText>
              <SegmentedControl
                label={t('hijri.adjust.title')}
                onChange={(key) => setDraft(clampAdjustDays(Number(key)))}
                options={OPTIONS.map((value) => ({ key: String(value), label: formatSignedDays(value, locale) }))}
                testID={`${testID}-segment`}
                value={String(draft)}
              />
              <Card padding={1} radius="lg" testID={`${testID}-compare`}>
                <ListRow
                  chevron={false}
                  testID={`${testID}-compare-before`}
                  title={t('hijri.adjust.ummAlQura')}
                  trailing={<UiText variant="subhead">{formatHijriDate(now, locale, 0)}</UiText>}
                />
                <ListRow
                  chevron={false}
                  testID={`${testID}-compare-after`}
                  title={t('hijri.adjust.after')}
                  trailing={<UiText variant="headline">{formatHijriDate(now, locale, draft)}</UiText>}
                />
              </Card>
              <View style={{ flexDirection: 'row', gap: theme.space[3] }}>
                <Button
                  label={t('hijri.adjust.reset')}
                  onPress={() => setDraft(0)}
                  stretch
                  testID={`${testID}-reset`}
                  variant="secondary"
                />
                <Button label={t('hijri.adjust.save')} onPress={save} stretch testID={`${testID}-save`} variant="primary" />
              </View>
            </View>
          </SheetScrollView>
        </View>
      </SheetFrame>
    </SheetHost>
  );
}
