import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useSvgMushafPack, type SvgMushafKey } from '@/core/mushaf-pack';
import { useTheme } from '@/core/theme';

import { MushafSvgList, type MushafSvgListProps } from '../MushafSvgList';

import { MushafDownloadCard } from './MushafDownloadCard';

export type MushafSvgContainerProps = Omit<MushafSvgListProps, 'reader'> & {
  /** Opens Reading mode from the download card (the download keeps running). */
  onReadNow?: () => void;
};

/**
 * Shows the Madinah list once the riwayah's pack is installed, and the download card until then. The first open starts
 * the download by itself (ADR 0090 decision 9); the installer keeps to Wi-Fi when the setting says so.
 */
export function MushafSvgContainer({ onReadNow, ...props }: MushafSvgContainerProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const pack = useSvgMushafPack(props.mushafKey);
  const started = useRef(false);
  const download = pack.download;

  useEffect(() => {
    if (pack.status === 'absent' && !started.current) {
      started.current = true;
      void download();
    }
  }, [download, pack.status]);

  if (pack.status === 'installed' && pack.reader !== null) {
    return <MushafSvgList {...props} reader={pack.reader} />;
  }

  // The card sits centred in the area the list would take (the frame centres it on the screen, below the toolbar).
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        paddingBottom: props.contentBottomInset ?? props.bottomInset ?? 0,
        paddingHorizontal: theme.space[4],
        paddingTop: props.topInset ?? 0,
      }}
    >
      <MushafDownloadCard
        error={pack.status === 'failed' ? pack.error : null}
        mushafName={t(`reader.mushafs.${props.mushafKey satisfies SvgMushafKey}.name`)}
        onCancel={pack.cancel}
        onDownload={() => void download()}
        onDownloadWithData={() => void download({ allowCellular: true })}
        onReadNow={() => onReadNow?.()}
        progress={pack.progress}
        sizeBytes={pack.sizeBytes}
        status={pack.status === 'installed' ? 'failed' : pack.status}
        testID={props.testID ? `${props.testID}-download` : undefined}
      />
    </View>
  );
}
