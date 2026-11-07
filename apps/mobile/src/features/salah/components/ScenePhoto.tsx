import { useState } from 'react';
import { Image, View, type ImageSourcePropType, type LayoutChangeEvent } from 'react-native';

// The salah scene photos are 1400 × 787 (design-assets/salah, ADR 0030 §4).
const PHOTO_ASPECT = 787 / 1400;

/**
 * A cover photo cropped at a chosen vertical focus, like the frames' `center <focusY>%`
 * (screens/, #Salah). RN's Image only centre-crops, so the photo is drawn
 * taller than its box and shifted up or down inside it.
 */
export function ScenePhoto({
  source,
  focusY,
  testID,
}: {
  source: ImageSourcePropType;
  /** 0 = crop to the photo's top edge, 1 = its bottom edge, 0.5 = centred. */
  focusY: number;
  testID?: string;
}) {
  const [box, setBox] = useState({ width: 0, height: 0 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== box.width || height !== box.height) {
      setBox({ width, height });
    }
  };

  const drawnHeight = box.width > 0 ? box.width * PHOTO_ASPECT : 0;
  const overflow = Math.max(0, drawnHeight - box.height);
  const top = -overflow * Math.min(1, Math.max(0, focusY));

  return (
    <View onLayout={onLayout} style={{ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }} testID={testID}>
      {drawnHeight > 0 ? (
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="cover"
          source={source}
          style={{ height: drawnHeight, left: 0, position: 'absolute', top, width: box.width }}
          testID={testID ? `${testID}-image` : undefined}
        />
      ) : null}
    </View>
  );
}
