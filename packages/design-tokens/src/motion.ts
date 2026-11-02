// Values from quran-app-design-system.html until the Figma file can be read (ADR 0005).
// Same in every theme.

// Milliseconds, for opacity and color changes. instant: word highlight. fast: ayah highlight
// cross-fade. standard: tab and small state changes. slow: Reduce Motion fades for
// custom overlays and the mini-player opening the player.
export const duration = {
  instant: 80,
  fast: 150,
  standard: 200,
  slow: 300,
  // An ornament's gold outline drawing itself in, once, when it first scrolls into view.
  draw: 700,
  // Launch splash: Taybah mark (minarets, dome, Arabic and Latin wordmark) drawn in sequence.
  splash: 1800,
  // One pulse of a loading skeleton, each way: opacity 1 to 0.55 and back (quran-app-screens.html, #loading).
  pulse: 1000,
} as const;

// Cubic bezier control points (x1, y1, x2, y2); easeOut matches CSS `ease-out`, easeInOut CSS `ease-in-out`.
export const easing = {
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
} as const;

// Position and size changes. A damping ratio of 1 settles without bouncing.
export const spring = {
  dampingRatio: 1,
  duration: 350,
} as const;

export type DurationToken = keyof typeof duration;
