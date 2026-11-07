import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import type { WindowClass } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { IconButton, TitlePill, ToolbarPill } from '@/shared/ui';

export const READER_TOOLBAR_CLEARANCE = 64;

// Points left and mirrors in Arabic, so Back always points toward the leading edge.
const BACK = { ios: 'chevron.left', android: 'chevron_left' } as const;
const BOOKMARK = { ios: 'bookmark', android: 'bookmark' } as const;
const SETTINGS = { ios: 'slider.horizontal.3', android: 'tune' } as const;
const ACTIONS = { ios: 'ellipsis.circle', android: 'more_horiz' } as const;
const PANEL = { ios: 'sidebar.right', android: 'view_sidebar' } as const;
const ENTER_FULLSCREEN = { ios: 'arrow.up.left.and.arrow.down.right', android: 'fullscreen' } as const;

// Focus has its own chrome (FocusChrome), so this bar draws only Reading and Mushaf.
// Reading on a phone draws Back, the title with «وضع القراءة» and one settings circle (its frame in
// screens/). Medium and expanded windows draw Back, the title with the page place, and one glass
// group: bookmark, reader settings, ayah actions, and on expanded the side panel toggle (#tablet-reader).
export type ReaderToolbarMode = 'reading' | 'mushaf';

export function ReaderToolbar({
  mode,
  title,
  subtitle,
  windowClass,
  panelOpen,
  bookmarked = false,
  onBack,
  onAyahActions,
  onBookmarkPage,
  onOpenSettings,
  onTogglePanel,
  onEnterFullscreen,
  testID = 'reader-toolbar',
}: {
  mode: ReaderToolbarMode;
  title: string;
  subtitle?: string;
  windowClass: WindowClass;
  panelOpen: boolean;
  bookmarked?: boolean;
  onBack: () => void;
  onAyahActions: () => void;
  onBookmarkPage: () => void;
  onOpenSettings: () => void;
  onTogglePanel: () => void;
  /** Mushaf only: the full screen button (ADR 0071). Omitted, no button is drawn. */
  onEnterFullscreen?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useContext(SafeAreaInsetsContext) ?? { bottom: 0, left: 0, right: 0, top: 0 };
  const readingMode = mode === 'reading';
  const compact = windowClass === 'compact';
  const expanded = windowClass === 'expanded';
  // A phone in Reading mode keeps only the settings circle.
  const lone = readingMode && compact;

  const settings = (
    <IconButton
      icon={SETTINGS}
      label={t('reader.toolbar.settings')}
      onPress={onOpenSettings}
      testID={lone ? 'reader-settings' : undefined}
      variant={lone ? 'glass' : 'plain'}
    />
  );
  // The side panel only exists on an expanded window; medium shows ayah actions as a sheet, so no toggle there.
  const panelToggle = expanded ? (
    <IconButton
      icon={PANEL}
      label={t('reader.toolbar.togglePanel')}
      onPress={onTogglePanel}
      pressed={panelOpen}
      testID="reader-panel-toggle"
    />
  ) : null;

  // Mushaf only: the full screen button sits in the tools pill, before the side panel toggle (ADR 0071).
  const fullscreenButton =
    mode === 'mushaf' && onEnterFullscreen !== undefined ? (
      <IconButton
        icon={ENTER_FULLSCREEN}
        label={t('reader.toolbar.enterFullscreen')}
        onPress={onEnterFullscreen}
        testID="reader-fullscreen"
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
          subtitle={lone ? t('reader.toolbar.readingSubtitle') : subtitle}
          testID="reader-title"
          title={title}
        />
      </View>
      {lone ? (
        settings
      ) : (
        <ToolbarPill label={t('reader.toolbar.tools')} testID="reader-tools">
          <IconButton icon={BOOKMARK} label={t('reader.toolbar.bookmarkPage')} onPress={onBookmarkPage} pressed={bookmarked} />
          {settings}
          <IconButton icon={ACTIONS} label={t('reader.toolbar.ayahActions')} onPress={onAyahActions} />
          {fullscreenButton}
          {panelToggle}
        </ToolbarPill>
      )}
    </View>
  );
}
