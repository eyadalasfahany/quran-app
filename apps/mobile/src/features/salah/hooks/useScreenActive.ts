import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * True while the screen is focused and the app is in the foreground. Sensors that only matter on screen (the Qibla
 * compass) are gated on this, so they stop on blur and on background and start again on focus.
 */
export function useScreenActive(): boolean {
  const [focused, setFocused] = useState(false);
  const [appActive, setAppActive] = useState(() => AppState.currentState === 'active');

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  return focused && appActive;
}
