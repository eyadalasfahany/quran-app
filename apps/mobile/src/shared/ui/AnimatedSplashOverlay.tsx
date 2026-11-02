import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SplashBrandMark } from './SplashBrandMark';

// Cream launch backdrop; matches expo-splash-screen backgroundColor in app.config.ts.
const LAUNCH_BACKGROUND = '#F9F7F2';

type Props = {
  appReady: boolean;
  onFinished: () => void;
};

// Brief branded splash after the native launch screen: Taybah mark SVG path draw.
export function AnimatedSplashOverlay({ appReady, onFinished }: Props) {
  const nativeHidden = useRef(false);
  const [drawComplete, setDrawComplete] = useState(false);

  const hideNativeSplash = useCallback(() => {
    if (nativeHidden.current) {
      return;
    }
    nativeHidden.current = true;
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (appReady && drawComplete) {
      onFinished();
    }
  }, [appReady, drawComplete, onFinished]);

  return (
    <View
      onLayout={hideNativeSplash}
      pointerEvents="auto"
      style={[StyleSheet.absoluteFill, styles.layer, { backgroundColor: LAUNCH_BACKGROUND }]}
      testID="animated-splash-overlay"
    >
      <View style={styles.center}>
        <SplashBrandMark onDrawComplete={() => setDrawComplete(true)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  layer: {
    zIndex: 9999,
  },
});
