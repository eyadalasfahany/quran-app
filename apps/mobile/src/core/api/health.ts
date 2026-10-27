import type { HealthResponse, paths } from '@quran/api-contract';

import { apiBaseUrl } from './base-url';

// Typed against the contract, so renaming the route in the API fails tsc here.
const HEALTH_PATH = '/health' satisfies keyof paths;

// The API answers 503 with the same body when the database or Redis is down.
const HEALTH_STATUSES = new Set([200, 503]);

export async function fetchHealth(baseUrl: string = apiBaseUrl()): Promise<HealthResponse> {
  const response = await fetch(`${baseUrl}/api/v1${HEALTH_PATH}`, {
    headers: { Accept: 'application/json' },
  });

  if (!HEALTH_STATUSES.has(response.status)) {
    throw new Error(`GET ${HEALTH_PATH} failed with ${response.status}`);
  }

  return (await response.json()) as HealthResponse;
}
