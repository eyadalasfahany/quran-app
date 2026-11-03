import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatNumber, useLocale } from '@/core/i18n';
import { setIqamahOffset } from '@/features/salah/data/notifications';
import { useIqamahOffset } from '@/features/salah/hooks/useIqamahOffset';
import { ListRow, UiText } from '@/shared/ui';

import { IqamahOffsetSheet } from './IqamahOffsetSheet';

/**
 * Settings row for the global iqamah offset (ADR 0056). Reuses SettingsGroup / ListRow tokens; no dedicated HTML frame
 * (ADR 0010 waiver recorded in ADR 0056).
 */
export function IqamahOffsetRow({ testID = 'iqamah-offset-row' }: { testID?: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const offset = useIqamahOffset();
  const [sheetOpen, setSheetOpen] = useState(false);
  const trailing =
    offset === 0
      ? t('salah.iqamahOffset.off')
      : t('salah.iqamahOffset.before', { count: offset, number: formatNumber(offset, locale) });

  return (
    <>
      <ListRow
        chevron
        onPress={() => setSheetOpen(true)}
        testID={testID}
        title={t('salah.iqamahOffset.label')}
        trailing={
          <UiText testID={`${testID}-value`} tone="muted" variant="subhead">
            {trailing}
          </UiText>
        }
      />
      {sheetOpen ? (
        <IqamahOffsetSheet
          onClose={() => setSheetOpen(false)}
          onSelect={(minutes) => {
            void setIqamahOffset(minutes);
          }}
          selected={offset}
          testID={`${testID}-sheet`}
          visible
        />
      ) : null}
    </>
  );
}
