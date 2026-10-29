// Reanimated's Jest matchers are declared in its native build, which TypeScript does not load.
// Declares `toHaveAnimatedStyle`, which `setUpTests()` from react-native-reanimated registers at run time.
declare namespace jest {
  interface Matchers<R> {
    toHaveAnimatedStyle(style: Record<string, unknown>, config?: { shouldMatchAllProps?: boolean }): R;
  }
}
