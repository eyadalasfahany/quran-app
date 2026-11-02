import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Share, View } from 'react-native';

import { openContentDb } from '@/core/db/content/open';
import { useTheme } from '@/core/theme';
import { useAudioAvailable } from '@/features/audio/hooks/useAudioAvailable';
import { useIsStarting, verseMatch } from '@/features/audio/hooks/useIsStarting';
import { pause } from '@/features/audio/player';
import { playVerse } from '@/features/audio/play-verse';
import { usePlayerStore } from '@/features/audio/playerStore';
import type { KhatmaPlan } from '@/features/khatma/data';
import { markKhatmaPosition, type KhatmaMarkBounds } from '@/features/khatma/mark-position';
import { setHighlight, toggleBookmark, type Note, type UserStore } from '@/features/library/data';
import { ActionTile, HighlightRow, type HighlightColor, type IconName, UiText } from '@/shared/ui';

import { idToVerseKey } from '../data/verses';
import { SheetScrollView } from '../components/SheetScrollView';
import { NoteEditor } from './NoteEditor';
import { ayahShareText } from './panel-text';

// Play starts the recitation from this ayah. Repeat waits for step 5 and stays visible but disabled.
const GRID_COLUMNS = 4;

// Ayah actions frame (quran-app-screens.html): 14 px between the sheet's blocks.
const SHEET_GAP = 14;

const icons = {
  play: { ios: 'play.fill', android: 'play_arrow' },
  pause: { ios: 'pause.fill', android: 'pause' },
  tafsir: { ios: 'book', android: 'menu_book' },
  bookmark: { ios: 'bookmark', android: 'bookmark' },
  bookmarked: { ios: 'bookmark.fill', android: 'bookmark_added' },
  khatma: { ios: 'book.closed', android: 'menu_book' },
  repeat: { ios: 'repeat', android: 'repeat' },
  note: { ios: 'note.text', android: 'edit_note' },
  copy: { ios: 'doc.on.doc', android: 'content_copy' },
  share: { ios: 'square.and.arrow.up', android: 'share' },
} as const satisfies Record<string, IconName>;

type Tile = {
  key: string;
  icon: IconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  selected?: boolean;
  hint?: string;
};

export function AyahActionsPanel({
  verseId,
  verseKey = null,
  verseNumber,
  page,
  textUthmani,
  reference,
  bookmarked,
  highlight,
  note,
  store,
  activeKhatmaPlan = null,
  khatmaMarkerVerseId = null,
  khatmaBoundsOverride,
  onKhatmaMarked,
  onOpenTafsir,
  testID = 'ayah-actions-panel',
}: {
  verseId: number;
  /** The ayah's key, so its «تشغيل من هنا» shows the start while audio loads (ADR 0046). */
  verseKey?: string | null;
  verseNumber: number;
  page: number;
  // Uthmani text exactly as stored; copied and shared byte for byte.
  textUthmani: string;
  // The reference line under copied text, for example «الفاتحة · الآية ٢».
  reference: string;
  bookmarked: boolean;
  highlight: HighlightColor | null;
  note: Note | null;
  store?: UserStore;
  activeKhatmaPlan?: KhatmaPlan | null;
  khatmaMarkerVerseId?: number | null;
  /** Tests pass plan bounds when content.db is unavailable under Jest. */
  khatmaBoundsOverride?: KhatmaMarkBounds;
  onKhatmaMarked?: (result: { logged: boolean; completed: boolean }) => void;
  onOpenTafsir?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [isBookmarked, setIsBookmarked] = useState(bookmarked);
  const [color, setColor] = useState<HighlightColor | null>(highlight);
  const [editingNote, setEditingNote] = useState(false);
  const [copied, setCopied] = useState(false);
  // Writes show at once; a newer stored value from the props (a live query) replaces them.
  const [synced, setSynced] = useState({ bookmarked, highlight, verseId });
  if (synced.bookmarked !== bookmarked || synced.highlight !== highlight || synced.verseId !== verseId) {
    setSynced({ bookmarked, highlight, verseId });
    setIsBookmarked(bookmarked);
    setColor(highlight);
    if (synced.verseId !== verseId) {
      setCopied(false);
      setEditingNote(false);
    }
  }

  const shareText = ayahShareText(textUthmani, verseNumber, reference);

  const onBookmark = () => {
    try {
      setIsBookmarked(toggleBookmark(verseId, store) !== null);
    } catch {
      // The live query restores the stored state.
    }
  };

  const onKhatmaMark = () => {
    if (activeKhatmaPlan === null) {
      return;
    }
    const result = markKhatmaPosition({
      boundsOverride: khatmaBoundsOverride,
      page,
      plan: activeKhatmaPlan,
      store,
      verseId,
    });
    onKhatmaMarked?.(result);
  };

  const onHighlight = (next: HighlightColor) => {
    const value = color === next ? null : next;
    try {
      setColor(setHighlight(verseId, value, store)?.color ?? null);
    } catch {
      // The live query restores the stored state.
    }
  };

  const onCopy = async () => {
    // The running dev client may not include ExpoClipboard until the next native rebuild.
    // Loading it here keeps the ayah sheet from crashing on open.
    try {
      // A static import crashes this dev client. require stays unlinked until Copy is pressed,
      // and it is the module Jest replaces in the copy test.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const clipboard = require('expo-clipboard') as { setStringAsync: (value: string) => Promise<boolean> };
      await clipboard.setStringAsync(shareText);
    } catch {
      return;
    }
    setCopied(true);
    AccessibilityInfo.announceForAccessibility(t('reader.ayahPanel.copied'));
  };

  const onShare = () => {
    void Share.share({ message: shareText });
  };

  const audioAvailable = useAudioAvailable();
  const audioHint = audioAvailable ? undefined : t('reader.ayahPanel.audioUnavailable');
  // This ayah is the one being recited: its play tile shows pause.
  const playingThis = usePlayerStore(
    (s) => (s.status === 'playing' || s.status === 'loading') && s.activeVerseId === verseId,
  );
  const starting = useIsStarting(verseMatch(verseKey));
  const onPlay = () => {
    const verseKey = idToVerseKey(openContentDb().executor, verseId);
    if (verseKey !== undefined) {
      void playVerse(verseKey);
    }
  };
  const tiles: Tile[] = [
    {
      // A recited ayah has audio, so its pause stays enabled even when the audio check says otherwise.
      disabled: !audioAvailable && !playingThis,
      hint: audioHint,
      icon: playingThis || starting ? icons.pause : icons.play,
      key: 'play',
      label: playingThis || starting ? t('player.pause') : t('reader.ayahPanel.play'),
      onPress: playingThis ? pause : onPlay,
      primary: true,
    },
    ...(onOpenTafsir
      ? [{ icon: icons.tafsir, key: 'tafsir', label: t('reader.ayahPanel.tafsir'), onPress: onOpenTafsir }]
      : []),
    {
      icon: isBookmarked ? icons.bookmarked : icons.bookmark,
      key: 'bookmark',
      label: isBookmarked ? t('reader.ayahPanel.bookmarked') : t('reader.ayahPanel.bookmark'),
      onPress: onBookmark,
      selected: isBookmarked,
    },
    ...(activeKhatmaPlan !== null
      ? [
          {
            icon: icons.khatma,
            key: 'khatma',
            label: t('reader.ayahPanel.khatmaMark'),
            onPress: onKhatmaMark,
            selected: khatmaMarkerVerseId === verseId,
          },
        ]
      : []),
    {
      disabled: true,
      hint: audioHint,
      icon: icons.repeat,
      key: 'repeat',
      label: t('reader.ayahPanel.repeat'),
      onPress: () => undefined,
    },
    {
      icon: icons.note,
      key: 'note',
      label: t('reader.ayahPanel.note'),
      onPress: () => setEditingNote((open) => !open),
      selected: editingNote,
    },
    { icon: icons.copy, key: 'copy', label: t('reader.ayahPanel.copy'), onPress: () => void onCopy() },
    { icon: icons.share, key: 'share', label: t('reader.ayahPanel.share'), onPress: onShare },
  ];

  return (
    <SheetScrollView contentContainerStyle={{ gap: SHEET_GAP, paddingBottom: theme.space[6] }} testID={testID}>
      <HighlightRow
        label={t('reader.ayahPanel.highlightTitle')}
        onSelect={onHighlight}
        selected={color}
        testID={`${testID}-highlight`}
      />
      <View accessibilityLabel={t('reader.ayahPanel.actionsLabel')} style={{ gap: theme.space[2] }}>
        {rows(tiles).map((row) => (
          <View key={row.map((tile) => tile.key).join('-')} style={{ flexDirection: 'row', gap: theme.space[2] }}>
            {row.map((tile) => (
              <ActionTile
                accessibilityHint={tile.hint}
                disabled={tile.disabled}
                icon={tile.icon}
                key={tile.key}
                label={tile.label}
                onPress={tile.onPress}
                selected={tile.selected}
                testID={`${testID}-${tile.key}`}
                variant={tile.primary ? 'primary' : 'default'}
              />
            ))}
            {Array.from({ length: GRID_COLUMNS - row.length }, (_, index) => (
              <View key={`spacer-${index}`} style={{ flex: 1 }} />
            ))}
          </View>
        ))}
      </View>
      {copied ? (
        <UiText accessibilityLiveRegion="polite" align="center" testID={`${testID}-copied`} tone="muted" variant="caption">
          {t('reader.ayahPanel.copied')}
        </UiText>
      ) : null}
      {editingNote ? (
        <NoteEditor
          key={note?.id ?? `new-${verseId}`}
          note={note}
          onDone={() => setEditingNote(false)}
          store={store}
          testID={`${testID}-note-editor`}
          verseId={verseId}
        />
      ) : null}
    </SheetScrollView>
  );
}
function rows(tiles: readonly Tile[]): Tile[][] {
  const result: Tile[][] = [];
  for (let index = 0; index < tiles.length; index += GRID_COLUMNS) {
    result.push(tiles.slice(index, index + GRID_COLUMNS));
  }
  return result;
}
