// Expo inlines EXPO_PUBLIC_* at build time, so this must be read as a literal member access.
// iOS simulator: http://localhost:8000. Android emulator: http://10.0.2.2:8000 (see .env.example).
export function apiBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_API_URL is not set. Copy apps/mobile/.env.example to .env.');
  }
  return url.replace(/\/+$/, '');
}
