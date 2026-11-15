import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { AzkarReaderControls } from '@/features/azkar/components/AzkarReaderControls';

import type { DuaPager } from '../data/category-pager';

/**
 * The previous and next chips of a dua detail (screens/, #DuaHadithDetail). They move within the pager's own list
 * (a category, or the whole list for a legacy route), replacing the current route so Back returns to the list.
 * The chips are the Azkar reader's, so they mirror with the layout direction.
 */
export function DuaPagerControls({
  pager,
  children,
  testID = 'dua-pager-controls',
}: {
  pager: DuaPager;
  children?: ReactNode;
  testID?: string;
}) {
  return (
    <AzkarReaderControls
      canNext={pager.nextHref !== null}
      canPrevious={pager.previousHref !== null}
      onNext={() => {
        if (pager.nextHref !== null) {
          router.replace(pager.nextHref);
        }
      }}
      onPrevious={() => {
        if (pager.previousHref !== null) {
          router.replace(pager.previousHref);
        }
      }}
      testID={testID}
    >
      {children}
    </AzkarReaderControls>
  );
}
