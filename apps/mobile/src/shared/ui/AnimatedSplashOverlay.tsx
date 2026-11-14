import { launchBackground } from '@quran/design-tokens';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SplashBrandMark } from './SplashBrandMark';

type Props = {
  appReady: boolean;
  onFinished: () => void;
};

// Brief branded splash after the native launch screen: the Taybah mark drawing itself in (ADR 0088).
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
      style={[StyleSheet.absoluteFill, styles.layer, { backgroundColor: launchBackground }]}
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
