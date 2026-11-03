import { router } from 'expo-router';
import { useCallback } from 'react';

import { useDiscoverProgress } from '../hooks/useDiscover';
import { DISCOVER_HREF, startTourAt } from '../open';
import type { DiscoverRowState } from '../progress';
import { finishDiscoverSet, hideDiscoverCard } from '../store';

import { DiscoverCard } from './DiscoverCard';

/** The Home card, wired to the stored progress. A row starts the guided tour at that step (ADR 0053). */
export function DiscoverHomeCard() {
  const progress = useDiscoverProgress();

  const onOpenRow = useCallback((row: DiscoverRowState) => {
    startTourAt(row.entry);
  }, []);

  return (
    <DiscoverCard
      onFinish={finishDiscoverSet}
      onHide={hideDiscoverCard}
      onOpenRow={onOpenRow}
      onViewAll={() => router.push(DISCOVER_HREF)}
      progress={progress}
    />
  );
}
