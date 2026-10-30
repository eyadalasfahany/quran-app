import type { IconName } from '@/shared/ui/Icon';

// Previous and next point the way playback steps go; callers pass mirrorInRtl so they flip with the layout
// direction. Play and pause never flip: the triangle maps to the timeline, not the reading direction.
export const PREVIOUS_AYAH_ICON = { ios: 'backward.end.fill', android: 'skip_previous' } as const satisfies IconName;
export const NEXT_AYAH_ICON = { ios: 'forward.end.fill', android: 'skip_next' } as const satisfies IconName;
export const PLAY_ICON = { ios: 'play.fill', android: 'play_arrow' } as const satisfies IconName;
export const PAUSE_ICON = { ios: 'pause.fill', android: 'pause' } as const satisfies IconName;
export const MINIMIZE_ICON = { ios: 'chevron.down', android: 'keyboard_arrow_down' } as const satisfies IconName;
export const MORE_ICON = { ios: 'ellipsis', android: 'more_horiz' } as const satisfies IconName;
export const REPEAT_ICON = { ios: 'repeat', android: 'repeat' } as const satisfies IconName;
export const RANGE_ICON = { ios: 'list.bullet', android: 'format_list_bulleted' } as const satisfies IconName;
export const SPEED_ICON = { ios: 'speedometer', android: 'speed' } as const satisfies IconName;
export const SLEEP_ICON = { ios: 'moon', android: 'bedtime' } as const satisfies IconName;
export const CHECK_ICON = { ios: 'checkmark', android: 'check' } as const satisfies IconName;
