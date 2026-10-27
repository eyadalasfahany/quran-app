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

export function ReaderToolbar({
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
        <TitlePill subtitle={subtitle} testID="reader-title" title={title} />
      </View>
      <ToolbarPill label={t('reader.toolbar.tools')} testID="reader-tools">
        <IconButton icon={BOOKMARK} label={t('reader.toolbar.bookmarkPage')} onPress={onBookmarkPage} pressed={bookmarked} />
        <IconButton icon={SETTINGS} label={t('reader.toolbar.settings')} onPress={onOpenSettings} />
        <IconButton icon={ACTIONS} label={t('reader.toolbar.ayahActions')} onPress={onAyahActions} />
        {expanded ? (
          <IconButton
            icon={PANEL}
            label={t('reader.toolbar.togglePanel')}
            onPress={onTogglePanel}
            pressed={panelOpen}
            testID="reader-panel-toggle"
          />
        ) : null}
      </ToolbarPill>
    </View>
  );
}
