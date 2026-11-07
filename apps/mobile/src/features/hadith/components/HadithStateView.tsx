import { useTranslation } from 'react-i18next';

import { EmptyState, type IconName } from '@/shared/ui';

import { HadithListSkeleton } from './HadithListSkeleton';

type StateKind = 'loading' | 'offlineEmpty' | 'error' | 'savedEmpty' | 'noResults' | 'notFound';

// Frames HadithCollLoading, HadithCollOffline, HadithCollError, HadithCollSavedEmpty and HadithCollSearchEmpty.
// notFound has no frame: a collection, book, chapter or hadith that is not in the device's packs.
// The shared EmptyState draws a 48 point icon, not the frames' 120 point star (Open question 11).
const CLOUD_OFF: IconName = { ios: 'icloud.slash', android: 'cloud_off' };
const BOOKMARK: IconName = { ios: 'bookmark', android: 'bookmark' };
const SEARCH: IconName = { ios: 'magnifyingglass', android: 'search' };
const BOOK: IconName = { ios: 'book.closed', android: 'menu_book' };

const STATES = {
  offlineEmpty: {
    title: 'hadith.states.offlineTitle',
    body: 'hadith.states.offlineBody',
    action: null,
    icon: CLOUD_OFF,
  },
  error: {
    title: 'hadith.states.errorTitle',
    body: 'hadith.states.errorBody',
    action: 'hadith.states.retry',
    icon: CLOUD_OFF,
  },
  savedEmpty: {
    title: 'hadith.states.savedEmptyTitle',
    body: 'hadith.states.savedEmptyBody',
    action: 'hadith.states.browse',
    icon: BOOKMARK,
  },
  noResults: {
    title: 'hadith.states.noResultsTitle',
    body: 'hadith.states.noResultsBody',
    action: null,
    icon: SEARCH,
  },
  notFound: {
    title: 'hadith.states.notFoundTitle',
    body: 'hadith.states.notFoundBody',
    action: 'hadith.states.browse',
    icon: BOOK,
  },
} as const;

/** The loading, empty and error states of a hadith screen. The action shows only when the kind has one and onAction is given. */
export function HadithStateView({
  kind,
  onAction,
  testID = 'hadith-state-view',
}: {
  kind: StateKind;
  onAction?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  if (kind === 'loading') {
    return <HadithListSkeleton testID={testID} />;
  }

  const config = STATES[kind];
  const action = config.action !== null && onAction !== undefined ? { label: t(config.action), onPress: onAction } : undefined;

  return (
    <EmptyState action={action} body={t(config.body)} icon={config.icon} testID={testID} title={t(config.title)} />
  );
}
