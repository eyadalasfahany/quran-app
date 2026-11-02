// The app's entry point. The Android widget task is registered first: a widget can wake the app with the JavaScript
// bundle loaded but the UI not started, and the task must already exist then (ADR 0035 §4).
import '@/features/widgets/android/entry';
import 'expo-router/entry';
