import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';
import { AzkarSectionTitle } from '@/features/azkar/components/AzkarSectionTitle';

/** A labelled block on Duas home («من القرآن», «من السنة»): heading, optional purpose caption, then content. */
export function DuasSection({
  title,
  caption,
  children,
  testID = 'duas-section',
}: {
  title: string;
  caption?: string;
  children: ReactNode;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[3] }} testID={testID}>
      <View style={{ gap: theme.space[1] }}>
        <AzkarSectionTitle testID={`${testID}-heading`} title={title} />
        {caption ? (
          <UiText style={{ paddingHorizontal: theme.space[1] }} tone="muted" variant="caption">
            {caption}
          </UiText>
        ) : null}
      </View>
      {children}
    </View>
  );
}
