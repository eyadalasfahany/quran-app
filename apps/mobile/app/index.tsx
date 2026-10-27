import { StyleSheet, View } from 'react-native';

// Placeholder until the nav shell (Phase 0, step 8). Its strings live in src/core/i18n.
export default function Index() {
  return <View style={styles.screen} testID="placeholder-screen" />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
