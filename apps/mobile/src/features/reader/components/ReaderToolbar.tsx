import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';
import { IconButton, TitlePill, ToolbarPill } from '@/shared/ui';

export const READER_TOOLBAR_CLEARANCE = 64;

// Points left and mirrors in Arabic, so Back always points toward the leading edge.
const BACK = { ios: 'chevron.left', android: 'chevron_left' } as const;
const BOOKMARK = { ios: 'bookmark', android: 'bookmark' } as const;
const SETTINGS = { ios: 'slider.horizontal.3', android: 'tune' } as const;
const ACTIONS = { ios: 'ellipsis.circle', android: 'more_horiz' } as const;
const PANEL = { ios: 'sidebar.right', android: 'view_sidebar' } as const;

// Reading mode draws only Back, the title and one settings control (its frame in quran-app-screens.html).
// Mushaf draws the tools group and the page subtitle. Focus keeps the Mushaf bar until its own frame is built.
export type ReaderToolbarMode = 'reading' | 'mushaf' | 'focus';

export function ReaderToolbar({
  mode,
  title,
  subtitle,
  expanded,
  panelOpen,
  bookmarked = false,
  onBack,
  onAyahActions,
  onBookmarkPage,
  onOpenSettings,
  onTogglePanel,
  testID = 'reader-toolbar',
}: {
  mode: ReaderToolbarMode;
  title: string;
  subtitle?: string;
  expanded: boolean;
  panelOpen: boolean;
  bookmarked?: boolean;
  onBack: () => void;
  onAyahActions: () => void;
  onBookmarkPage: () => void;
  onOpenSettings: () => void;
  onTogglePanel: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useContext(SafeAreaInsetsContext) ?? { bottom: 0, left: 0, right: 0, top: 0 };
  const readingMode = mode === 'reading';
  // A phone in Reading mode keeps only the settings circle; expanded windows keep the group for the panel toggle.
  const lone = readingMode && !expanded;

  const settings = (
    <IconButton
      icon={SETTINGS}
      label={t('reader.toolbar.settings')}
      onPress={onOpenSettings}
      testID={lone ? 'reader-settings' : undefined}
      variant={lone ? 'glass' : 'plain'}
    />
  );
  const panelToggle = expanded ? (
    <IconButton
      icon={PANEL}
      label={t('reader.toolbar.togglePanel')}
      onPress={onTogglePanel}
      pressed={panelOpen}
      testID="reader-panel-toggle"
    />
  ) : null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: theme.space[2],
        paddingHorizontal: theme.space[4],
        paddingTop: insets.top + theme.space[2],
      }}
      testID={testID}
    >
      <IconButton
        icon={BACK}
        label={t('reader.toolbar.back')}
        mirrorInRtl
        onPress={onBack}
        testID="reader-back"
        variant="glass"
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <TitlePill
          subtitle={readingMode ? t('reader.toolbar.readingSubtitle') : subtitle}
          testID="reader-title"
          title={title}
        />
      </View>
      {lone ? (
        settings
      ) : (
        <ToolbarPill label={t('reader.toolbar.tools')} testID="reader-tools">
          {readingMode ? null : (
            <IconButton icon={BOOKMARK} label={t('reader.toolbar.bookmarkPage')} onPress={onBookmarkPage} pressed={bookmarked} />
          )}
          {settings}
          {readingMode ? null : (
            <IconButton icon={ACTIONS} label={t('reader.toolbar.ayahActions')} onPress={onAyahActions} />
          )}
          {panelToggle}
        </ToolbarPill>
      )}
    </View>
  );
}
