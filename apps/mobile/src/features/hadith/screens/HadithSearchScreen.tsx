import { useState } from 'react';
import { View } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { goBackOr } from '@/core/navigation/go-back';
import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';

import { HadithListHeader } from '../components/HadithListHeader';
import { HadithSearchField } from '../components/HadithSearchField';
import { hadithHref } from '../routes';

/** Hadith search. A stub until step 14: the field and cancel only, no results. */
export function HadithSearchScreen({ testID = 'screen-hadith-search' }: { testID?: string }) {
  const theme = useTheme();
  const [value, setValue] = useState('');
  const back = () => goBackOr(hadithHref.home);

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, gap: theme.space[4], paddingTop: theme.space[2] }}>
          <HadithListHeader onBack={back} />
          <HadithSearchField autoFocus onCancel={back} onChangeText={setValue} onSubmit={() => undefined} value={value} />
        </View>
      </ContentColumn>
    </Screen>
  );
}
