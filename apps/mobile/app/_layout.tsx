import { Stack } from 'expo-router';

// Providers, the database ready gate and the onboarding redirect land here in later steps (spec §4).
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
