<?php

declare(strict_types=1);

namespace App\Integrations\AppStores;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Reads the live Play Store version from the public listing page.
 *
 * This page is undocumented and can change, so a null simply means no new information. Only one distinct
 * version on the page is trusted; two different values mean the page is unclear and the result is null,
 * because an unclear page must never force anyone to update. Never throws on HTTP or connection failure.
 */
final class PlayStoreClient
{
    private const string LISTING_URL = 'https://play.google.com/store/apps/details';

    private const string VERSION_PATTERN = '/\[\[\["(\d+(?:\.\d+)+)"\]\]/';

    public function latestVersion(string $bundleId): ?string
    {
        try {
            $response = Http::timeout(10)
                ->withHeaders(['User-Agent' => 'Mozilla/5.0'])
                ->retry(2, 500, throw: false)
                ->get(self::LISTING_URL, ['id' => $bundleId, 'hl' => 'en', 'gl' => 'US']);
        } catch (ConnectionException) {
            return null;
        }

        if (! $response->successful()) {
            return null;
        }

        preg_match_all(self::VERSION_PATTERN, $response->body(), $matches);

        $versions = array_values(array_unique($matches[1]));

        return count($versions) === 1 ? $versions[0] : null;
    }
}
