import type { ModalProps } from 'react-native';

/**
 * Every orientation, for each React Native `Modal`. Without it iOS presents a modal in portrait only, which rotates an
 * iPhone held in landscape back to portrait whenever a sheet or dialog opens (no orientation locks: apps/mobile/CLAUDE.md).
 */
export const MODAL_ORIENTATIONS: NonNullable<ModalProps['supportedOrientations']> = [
  'portrait',
  'portrait-upside-down',
  'landscape-left',
  'landscape-right',
];
