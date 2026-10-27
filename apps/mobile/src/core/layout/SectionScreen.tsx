import type { ReactNode } from 'react';

import { Screen, ScreenHeader } from '@/shared/ui';

import { ContentColumn } from './ContentColumn';

export function SectionScreen({
  title,
  testID,
  children,
}: {
  title: string;
  testID: string;
  children?: ReactNode;
}) {
  return (
    <Screen testID={testID}>
      <ContentColumn>
        <ScreenHeader title={title} />
        {children}
      </ContentColumn>
    </Screen>
  );
}
