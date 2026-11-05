/**
 * Whether the exact-alarm prompt is due after the default prayer bells turned on (ADR 0064). It is state, not an event:
 * arming can finish before the splash ends and the host mounts, so the host reads the current value when it mounts.
 * In memory only: a prompt is shown once per arming, and a relaunch that finds exact alarms still denied is covered by
 * the bell's own prompt. Nothing here is persisted.
 */

type Listener = () => void;

let visible = false;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function showExactAlarmPrompt(): void {
  if (!visible) {
    visible = true;
    emit();
  }
}

export function dismissExactAlarmPrompt(): void {
  if (visible) {
    visible = false;
    emit();
  }
}

export function isExactAlarmPromptVisible(): boolean {
  return visible;
}

/** Subscribes to changes of the prompt state; returns the function that unsubscribes. */
export function subscribeExactAlarmPrompt(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
