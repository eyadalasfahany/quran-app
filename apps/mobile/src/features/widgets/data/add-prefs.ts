import { storage, storageKeys } from '@/core/storage/mmkv';

export type WidgetAddDestination = 'home' | 'lock';

/** Lock when the catalog entry supports it (ADR 0054, ADR 0035 lock privacy). */
export function effectiveAddDestination(
  destinations: readonly WidgetAddDestination[],
  destination: WidgetAddDestination,
): WidgetAddDestination {
  if (destinations.includes('lock') && destination === 'lock') {
    return 'lock';
  }
  return 'home';
}

const DEFAULT_DESTINATION: WidgetAddDestination = 'home';

function isDestination(value: string | undefined): value is WidgetAddDestination {
  return value === 'home' || value === 'lock';
}

export function readWidgetAddDestination(): WidgetAddDestination {
  return isDestination(storage.getString(storageKeys.widgets.addDestination))
    ? (storage.getString(storageKeys.widgets.addDestination) as WidgetAddDestination)
    : DEFAULT_DESTINATION;
}

export function saveWidgetAddDestination(destination: WidgetAddDestination): void {
  storage.set(storageKeys.widgets.addDestination, destination);
}

type PinCompletedMap = Record<string, true>;

function readPinCompletedMap(): PinCompletedMap {
  const raw = storage.getString(storageKeys.widgets.pinCompleted);
  if (raw === undefined) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as PinCompletedMap;
  } catch {
    return {};
  }
}

/** Soft hint after a successful pin — not proof the widget is still on the home screen (ADR 0054). */
export function readWidgetPinCompleted(provider: string): boolean {
  return readPinCompletedMap()[provider] === true;
}

export function markWidgetPinCompleted(provider: string): void {
  const map = readPinCompletedMap();
  map[provider] = true;
  storage.set(storageKeys.widgets.pinCompleted, JSON.stringify(map));
}
