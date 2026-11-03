/** Notifies feature layers when appearance prefs change, without core importing features. */

let listener: (() => void) | null = null;

export function setAppearanceChangeListener(onChange: (() => void) | null): void {
  listener = onChange;
}

export function notifyAppearanceChanged(): void {
  listener?.();
}
