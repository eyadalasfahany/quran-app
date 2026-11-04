import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { openContentDb } from '@/core/db/content/open';
import { useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { AzkarListCard } from '@/features/azkar/components/AzkarListCard';
import { getEntry } from '@/features/azkar/data/content-repository';
import { referenceNumber } from '@/features/azkar/reader-model';
import { azkarHref } from '@/features/azkar/routes';
import { useAzkarAvailable } from '@/features/azkar/data';

import type { PropheticDuaLink } from '../data/model';
import { DuaLinkRow } from './DuaLinkRow';

function hisnLinkTitle(entryKey: string, locale: 'ar' | 'en', translate: (key: string, options?: Record<string, string>) => string): string | null {
  try {
    const { executor } = openContentDb();
    const detail = getEntry(executor, entryKey);

    if (detail === undefined) {
      return null;
    }

    return translate('duas.hadith.linkHisn', {
      number: referenceNumber(detail.entry.sourceReference, locale),
    });
  } catch {
    return null;
  }
}

/** Related Hisn and collection rows on prophetic dua detail; hidden when nothing resolves. */
export function DuaLinkCard({ links, testID = 'dua-link-card' }: { links: readonly PropheticDuaLink[]; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const azkarAvailable = useAzkarAvailable();
  const translate = t as unknown as (key: string, options?: Record<string, string>) => string;

  const rows = links.flatMap((link) => {
    if (link.kind === 'hisn') {
      if (!azkarAvailable) {
        return [];
      }

      const title = hisnLinkTitle(link.entryKey, locale, translate);

      if (title === null) {
        return [];
      }

      return [
        {
          key: `hisn-${link.entryKey}`,
          title,
          onPress: () => router.push(azkarHref.entry(link.entryKey)),
          testID: `dua-link-hisn-${link.entryKey}`,
        },
      ];
    }

    return [];
  });

  if (rows.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <AzkarListCard>
        {rows.map((row, index) => (
          <DuaLinkRow
            key={row.key}
            onPress={row.onPress}
            separator={index < rows.length - 1}
            testID={row.testID}
            title={row.title}
          />
        ))}
      </AzkarListCard>
    </View>
  );
}
