import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import type { VerseTranslationBlock } from '../reading-list-types';

// One translation under an ayah, in the translation's own direction, with its attribution.
export function TranslationBlock({ block, testID }: { block: VerseTranslationBlock; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const attribution =
    block.meta.authorName === null
      ? t('reader.translationAttribution', { name: block.meta.name })
      : t('reader.translationAttributionWithAuthor', { author: block.meta.authorName, name: block.meta.name });

  return (
    <View style={{ gap: theme.space[1], marginTop: theme.space[2] }} testID={testID}>
      <UiText
        align={block.meta.direction === 'rtl' ? 'right' : 'left'}
        style={{ writingDirection: block.meta.direction }}
        tone="muted"
        variant="subhead"
      >
        {block.text}
      </UiText>
      <UiText tone="muted" variant="caption">
        {attribution}
      </UiText>
    </View>
  );
}
