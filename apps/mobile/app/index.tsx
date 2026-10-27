import { StyleSheet, View } from 'react-native';

// Placeholder until the nav shell (Phase 0, step 8). No text yet: strings arrive with i18n in step 7.
export default function Index() {
  return <View style={styles.screen} testID="placeholder-screen" />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
