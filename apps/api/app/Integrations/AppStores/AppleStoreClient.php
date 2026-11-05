<?php

declare(strict_types=1);

namespace App\Integrations\AppStores;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Looks up the live App Store version with Apple's public iTunes lookup API.
 * Never throws on HTTP or connection failure: a null means no new information.
 */
final class AppleStoreClient
{
    private const string LOOKUP_URL = 'https://itunes.apple.com/lookup';

    private const string VERSION_PATTERN = '/^\d+(\.\d+)*$/';

    public function latestVersion(string $appStoreId, string $bundleId): ?string
    {
        try {
            $response = Http::acceptJson()
                ->timeout(10)
                ->retry(2, 500, throw: false)
                ->get(self::LOOKUP_URL, ['id' => $appStoreId]);
        } catch (ConnectionException) {
            return null;
        }

        return $this->versionFrom($response, $bundleId);
    }

    private function versionFrom(Response $response, string $bundleId): ?string
    {
        if (! $response->successful()) {
            return null;
        }

        $body = $response->json();

        if (! is_array($body) || ($body['resultCount'] ?? null) !== 1) {
            return null;
        }

        $results = $body['results'] ?? null;
        $first = is_array($results) ? ($results[0] ?? null) : null;

        if (! is_array($first) || ($first['bundleId'] ?? null) !== $bundleId) {
            return null;
        }

        $version = $first['version'] ?? null;

        if (! is_string($version) || preg_match(self::VERSION_PATTERN, $version) !== 1) {
            return null;
        }

        return $version;
    }
}
