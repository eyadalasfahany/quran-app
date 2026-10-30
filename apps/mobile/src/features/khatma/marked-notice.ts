export type KhatmaMarkedResult = { logged: boolean; completed: boolean };

type Listener = (result: KhatmaMarkedResult) => void;

const listeners = new Set<Listener>();

/** Lets the ayah sheet notify ReaderScreen to show the marked pill. */
export function publishKhatmaMarkedNotice(result: KhatmaMarkedResult): void {
  for (const listener of listeners) {
    listener(result);
  }
}

export function subscribeKhatmaMarkedNotice(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
