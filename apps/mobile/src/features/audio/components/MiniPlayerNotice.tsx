import Animated from 'react-native-reanimated';

import { useDissolve } from '@/core/theme/motion';
import { UiText } from '@/shared/ui';

// The skip notice's line under a playing bar's subtitle (#ReadingMiniSkipped, ADR 0062): one gold-ink line that
// dissolves in and out. Opacity only, so Reduce Motion changes nothing here. The line is not a live region: the
// announcement is made once per notice by useSkipNoticeMessage (announceForAccessibility), so TalkBack speaks it once.
export function MiniPlayerNotice({ message, testID }: { message: string; testID?: string }) {
  const dissolve = useDissolve();
  return (
    <Animated.View entering={dissolve.entering} exiting={dissolve.exiting} testID={testID}>
      <UiText
        accessible
        numberOfLines={1}
        role="status"
        scale="bar"
        tone="goldInk"
        variant="label"
        weight={600}
      >
        {message}
      </UiText>
    </Animated.View>
  );
}
