import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatPercent } from '@/core/i18n';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { CollectionCover, Icon, UiText, useContrastColors } from '@/shared/ui';

import { formatPackSizeMb } from '../format';
import { collectionAuthor, collectionTitle, coverTitle } from '../titles';
import { collectionSummary } from '../counts';

import { CollectionDownloadButton, type CollectionDownloadState } from './CollectionDownloadButton';
import { HadithOfflinePill } from './HadithOfflinePill';

const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;
// Frame HadithCollList: a row that is not installed and offline is dimmed to 0.5 (theme.opacity.disabled is 0.45).
const OFFLINE_DIM = 0.5;
const CHEVRON_SIZE = 16;
const TITLE_SIZE = 19;
const TITLE_LINE_HEIGHT = 33;

export type CollectionRowData = {
  slug: string | null; // null: not installed and the slug is unknown (Open question 1), draws the neutral cover
  number: number;
  titleAr: string | null;
  titleEn: string | null;
  authorAr: string | null;
  authorEn: string | null;
  totalHadith: number | null; // null until installed
  booksCount: number | null;
  soleBook: boolean; // true: counts read «٤٢ حديثًا · كتاب واحد»
};

/**
 * A collection in the list. The row opens the collection; the trailing download control is a separate button.
 * A failed row keeps its retry pill inside the text column, so no two buttons are ever nested.
 */
export function CollectionRow({
  collection,
  state,
  onPress,
  onDownload,
  onCancel,
  onRetry,
  testID = 'collection-row',
}: {
  collection: CollectionRowData;
  state: CollectionDownloadState;
  onPress: () => void;
  onDownload: () => void;
  onCancel: () => void;
  onRetry: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const colors = useContrastColors();
  const title = collectionTitle(collection, locale, t);
  const author = collectionAuthor(collection, locale);
  const dimmed = state.kind === 'available' && state.offline;
  const cardStyle = {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    gap: theme.space[3],
    padding: theme.space[4],
  } as const;
  const cover = <CollectionCover size="list" slug={collection.slug} testID={`${testID}-cover`} title={coverTitle(collection, locale)} />;
  const authorLine = author !== null ? (
    <UiText testID={`${testID}-author`} tone="muted" variant="caption">
      {author}
    </UiText>
  ) : null;

  if (state.kind === 'failed') {
    const headingLabel = [title, author].filter((part): part is string => part !== null).join(', ');
    return (
      <View style={cardStyle} testID={testID}>
        <Pressable accessibilityLabel={headingLabel} accessibilityRole="button" onPress={onPress} testID={`${testID}-open-cover`}>
          {cover}
        </Pressable>
        <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
          <Pressable accessibilityLabel={headingLabel} accessibilityRole="button" onPress={onPress} testID={`${testID}-open-text`}>
            <UiText testID={`${testID}-title`} variant="displaySm" style={{ fontSize: TITLE_SIZE, lineHeight: TITLE_LINE_HEIGHT }}>
              {title}
            </UiText>
            {authorLine}
          </Pressable>
          <UiText testID={`${testID}-failed`} tone="danger" variant="label" weight={400}>
            {t('ui.download.failed')}
          </UiText>
          <CollectionDownloadButton
            collectionTitle={title}
            onCancel={onCancel}
            onDownload={onDownload}
            onRetry={onRetry}
            state={state}
            testID={`${testID}-download`}
          />
        </View>
      </View>
    );
  }

  let status: string | null = null;
  if (state.kind === 'installed') {
    status =
      collection.totalHadith !== null && collection.booksCount !== null
        ? collectionSummary(collection.totalHadith, collection.booksCount, collection.soleBook, locale, t)
        : null;
  } else if (state.kind === 'available') {
    status = t('ui.download.size', { size: formatPackSizeMb(state.sizeBytes, locale) });
  } else if (state.kind === 'waiting') {
    status = t('hadith.download.waitingWifi');
  } else {
    const percent = formatPercent(Math.round(Math.min(1, Math.max(0, state.progress)) * 100), locale);
    status = t('hadith.download.progress', { percent });
  }

  const bodyLabel = [title, author, status].filter((part): part is string => part !== null && part !== '').join(', ');
  const body = (
    <Pressable
      accessibilityLabel={bodyLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
        gap: theme.space[3],
        minWidth: 0,
        opacity: dimmed ? OFFLINE_DIM : pressed ? theme.opacity.pressed : 1,
      })}
      testID={`${testID}-body`}
    >
      {cover}
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <UiText testID={`${testID}-title`} variant="displaySm" style={{ fontSize: TITLE_SIZE, lineHeight: TITLE_LINE_HEIGHT }}>
          {title}
        </UiText>
        {authorLine}
        {state.kind === 'downloading' ? (
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(1, Math.max(0, state.progress)) * 100) }}
            style={{ backgroundColor: colors.line, borderRadius: theme.radius.progress, height: theme.size.progressHeight, overflow: 'hidden' }}
            testID={`${testID}-progress`}
          >
            <View
              style={{
                backgroundColor: theme.colors.brand,
                borderRadius: theme.radius.progress,
                height: theme.size.progressHeight,
                width: `${Math.round(Math.min(1, Math.max(0, state.progress)) * 100)}%`,
              }}
            />
          </View>
        ) : null}
        {status !== null ? (
          <UiText testID={`${testID}-status`} tone="muted" variant="label" weight={400}>
            {status}
          </UiText>
        ) : null}
        {state.kind === 'available' && state.offline ? <HadithOfflinePill testID={`${testID}-offline`} /> : null}
      </View>
      {state.kind === 'installed' ? (
        <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={CHEVRON_SIZE} testID={`${testID}-chevron`} />
      ) : null}
    </Pressable>
  );

  return (
    <View style={cardStyle} testID={testID}>
      {body}
      {state.kind === 'available' || state.kind === 'downloading' || state.kind === 'waiting' ? (
        <CollectionDownloadButton
          collectionTitle={title}
          onCancel={onCancel}
          onDownload={onDownload}
          onRetry={onRetry}
          state={state}
          testID={`${testID}-download`}
        />
      ) : null}
    </View>
  );
}
