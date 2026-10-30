import { Stack } from 'expo-router';

// The Listen tab's stack: the reciter's page is pushed on top of the list, and the tab bar stays.
export default function ListenLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
