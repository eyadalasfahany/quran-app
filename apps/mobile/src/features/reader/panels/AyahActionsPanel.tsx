import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, ScrollView, Share, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { setHighlight, toggleBookmark, type Note, type UserStore } from '@/features/library/data';
import {
  ActionTile,
  highlightColors,
  HighlightSwatch,
  type HighlightColor,
  type IconName,
  UiText,
  WordMeaningChip,
} from '@/shared/ui';

import { NoteEditor } from './NoteEditor';
import { PanelSection } from './PanelSection';
import { ayahShareText } from './panel-text';

// Recitation arrives in Phase 3. Until then play and repeat stay visible but disabled.
const AUDIO_AVAILABLE = false;

const GRID_COLUMNS = 4;

const icons = {
  play: { ios: 'play.fill', android: 'play_arrow' },
  tafsir: { ios: 'book', android: 'menu_book' },
  translation: { ios: 'character.book.closed', android: 'translate' },
  bookmark: { ios: 'bookmark', android: 'bookmark' },
  bookmarked: { ios: 'bookmark.fill', android: 'bookmark_added' },
  repeat: { ios: 'repeat', android: 'repeat' },
  note: { ios: 'note.text', android: 'edit_note' },
  copy: { ios: 'doc.on.doc', android: 'content_copy' },
  share: { ios: 'square.and.arrow.up', android: 'share' },
} as const satisfies Record<string, IconName>;

export type WordMeaning = { position: number; word: string; meaning: string };

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
  verseNumber,
  textUthmani,
  reference,
  words,
  meaningDirection = 'ltr',
  fontScale = 1,
  bookmarked,
  highlight,
  note,
  store,
  onOpenTafsir,
  onOpenTranslation,
  testID = 'ayah-actions-panel',
}: {
  verseId: number;
  verseNumber: number;
  // Uthmani text exactly as stored; copied and shared byte for byte.
  textUthmani: string;
  // The reference line under copied text, for example «الفاتحة · الآية ٢».
  reference: string;
  // Word chips need the word-by-word resource; an empty list hides the section.
  words: readonly WordMeaning[];
  meaningDirection?: 'rtl' | 'ltr';
  fontScale?: number;
  bookmarked: boolean;
  highlight: HighlightColor | null;
  note: Note | null;
  store?: UserStore;
  onOpenTafsir?: () => void;
  onOpenTranslation?: () => void;
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

  const audioHint = AUDIO_AVAILABLE ? undefined : t('reader.ayahPanel.audioUnavailable');
  const tiles: Tile[] = [
    {
      disabled: !AUDIO_AVAILABLE,
      hint: audioHint,
      icon: icons.play,
      key: 'play',
      label: t('reader.ayahPanel.play'),
      onPress: () => undefined,
      primary: true,
    },
    ...(onOpenTafsir
      ? [{ icon: icons.tafsir, key: 'tafsir', label: t('reader.ayahPanel.tafsir'), onPress: onOpenTafsir }]
      : []),
    ...(onOpenTranslation
      ? [{ icon: icons.translation, key: 'translation', label: t('reader.ayahPanel.translation'), onPress: onOpenTranslation }]
      : []),
    {
      icon: isBookmarked ? icons.bookmarked : icons.bookmark,
      key: 'bookmark',
      label: isBookmarked ? t('reader.ayahPanel.bookmarked') : t('reader.ayahPanel.bookmark'),
      onPress: onBookmark,
      selected: isBookmarked,
    },
    {
      disabled: !AUDIO_AVAILABLE,
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
    <ScrollView contentContainerStyle={{ gap: theme.space[5], paddingBottom: theme.space[6] }} testID={testID}>
      {words.length === 0 ? null : (
        <PanelSection title={t('reader.ayahPanel.wordsTitle')}>
          <View
            // Quran words read right to left in every interface language.
            style={{ direction: 'rtl', flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}
            testID={`${testID}-words`}
          >
            {words.map((word) => (
              <WordMeaningChip
                fontScale={fontScale}
                key={word.position}
                meaning={word.meaning}
                meaningDirection={meaningDirection}
                testID={`${testID}-word-${word.position}`}
                word={word.word}
              />
            ))}
          </View>
        </PanelSection>
      )}
      <PanelSection title={t('reader.ayahPanel.highlightTitle')}>
        <View style={{ flexDirection: 'row', gap: theme.space[2] }}>
          {highlightColors.map((swatch) => (
            <HighlightSwatch
              color={swatch}
              key={swatch}
              onPress={() => onHighlight(swatch)}
              selected={color === swatch}
              testID={`${testID}-highlight-${swatch}`}
            />
          ))}
        </View>
      </PanelSection>
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
    </ScrollView>
  );
}
function rows(tiles: readonly Tile[]): Tile[][] {
  const result: Tile[][] = [];
  for (let index = 0; index < tiles.length; index += GRID_COLUMNS) {
    result.push(tiles.slice(index, index + GRID_COLUMNS));
  }
  return result;
}
