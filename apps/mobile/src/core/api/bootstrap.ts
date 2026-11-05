import type { BootstrapResponse, paths } from '@quran/api-contract';

import { apiError, apiGet } from './client';

const BOOTSTRAP_PATH = '/bootstrap' satisfies keyof paths;

export async function getBootstrap(): Promise<BootstrapResponse> {
  const response = await apiGet(BOOTSTRAP_PATH);
  if (!response.ok) {
    throw await apiError(response);
  }
  return (await response.json()) as BootstrapResponse;
}
