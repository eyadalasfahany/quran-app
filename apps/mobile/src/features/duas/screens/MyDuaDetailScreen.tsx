import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatNumber, useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { Button, Screen } from '@/shared/ui';
import { AzkarReaderControls } from '@/features/azkar/components/AzkarReaderControls';
import { AzkarReaderTopBar } from '@/features/azkar/components/AzkarReaderTopBar';
import { AzkarTextSizeControl } from '@/features/azkar/components/AzkarTextSizeControl';
import { useAzkarFontScale } from '@/features/azkar/data/hooks';

import { MyDuaBody } from '../components/MyDuaBody';
import { MyDuaReaderActions } from '../components/MyDuaReaderActions';
import { getMyDua } from '../data/my-duas-repository';
import { useMyDuas } from '../data/hooks';
import { duaMineShareText } from '../data/share-text';
import { useMyDuaCaption } from '../data/use-my-dua-caption';
import { duasHref, goBackOr } from '../routes';

/**
 * One «أدعيتي» entry, read on its own (screens/, #MyDuaDetail). The text is the user's own, shown as written.
 * Previous and next follow the list's order. A dua that is gone (deleted, or a stale notification) leaves for the list and
 * draws nothing, so no broken screen shows.
 */
export function MyDuaDetailScreen({ duaId, testID = 'screen-my-dua-detail' }: { duaId: string; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const duas = useMyDuas();
  // The live list is the source of the text, so an edit shows here as soon as the list has it. The direct read is only the
  // fallback while the list loads, so a fresh open does not redirect; it is re-read when the screen regains focus.
  const [focusTick, setFocusTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusTick((tick) => tick + 1);
    }, []),
  );
  const direct = useMemo(
    () => getMyDua(duaId),
    // The counter and the list are deliberate triggers: a focus or a list change re-reads the repository.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [duaId, duas, focusTick],
  );
  const dua = duas.find((item) => item.id === duaId) ?? direct;
  const caption = useMyDuaCaption(duaId, dua?.title ?? null);
  const [fontScale, setFontScale] = useAzkarFontScale();
  const [textSizeOpen, setTextSizeOpen] = useState(false);

  const missing = dua === null;
  useEffect(() => {
    if (missing) {
      router.replace(duasHref.mine);
    }
  }, [missing]);

  if (dua === null) {
    return null;
  }

  const index = duas.findIndex((item) => item.id === duaId);
  const position = index < 0 ? 0 : index + 1;
  const previous = index > 0 ? duas[index - 1] : undefined;
  const next = index >= 0 && index < duas.length - 1 ? duas[index + 1] : undefined;
  const progressText = t('duas.mine.progress', {
    current: formatNumber(position, locale),
    total: formatNumber(duas.length, locale),
  });
  const fraction = duas.length === 0 ? 0 : position / duas.length;

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, paddingBottom: insets.bottom }}>
          <AzkarReaderTopBar
            fraction={fraction}
            onClose={() => goBackOr(duasHref.mine)}
            progressText={progressText}
            title={t('duas.mine.title')}
          />
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              gap: theme.size.sectionGap,
              justifyContent: 'center',
              paddingBottom: theme.space[6],
              paddingTop: theme.space[4],
            }}
          >
            <MyDuaBody body={dua.body} caption={caption} fontScale={fontScale} />
          </ScrollView>
          <MyDuaReaderActions
            duaId={duaId}
            onShare={() => {
              void Share.share({ message: duaMineShareText(dua.body) });
            }}
            onTextSize={() => setTextSizeOpen((open) => !open)}
            textSizeOpen={textSizeOpen}
          />
          {textSizeOpen ? <AzkarTextSizeControl onChange={setFontScale} value={fontScale} /> : null}
          <AzkarReaderControls
            canNext={next !== undefined}
            canPrevious={previous !== undefined}
            onNext={() => next !== undefined && router.replace(duasHref.mineDetail(next.id))}
            onPrevious={() => previous !== undefined && router.replace(duasHref.mineDetail(previous.id))}
          >
            <Button
              label={t('duas.mine.edit')}
              onPress={() => router.push(duasHref.mineEdit(duaId))}
              stretch
              testID="my-dua-detail-edit"
              variant="primary"
            />
          </AzkarReaderControls>
        </View>
      </ContentColumn>
    </Screen>
  );
}
