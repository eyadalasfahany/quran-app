<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Integrations\QuranFoundation\ContentSyncClient;
use App\Integrations\QuranFoundation\OAuthTokenProvider;
use App\Integrations\QuranFoundation\QfConfig;
use App\Integrations\QuranFoundation\QfHttp;
use JsonException;
use RuntimeException;

final class QuranFoundationFixture
{
    /**
     * @return array<string, mixed>
     */
    public static function load(string $name): array
    {
        $path = dirname(__DIR__).'/Fixtures/qf/'.$name;
        $json = file_get_contents($path);

        if ($json === false) {
            throw new RuntimeException('Missing Quran Foundation fixture ['.$name.'].');
        }

        try {
            $decoded = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new RuntimeException('Quran Foundation fixture ['.$name.'] is not valid JSON.', previous: $exception);
        }

        if (! is_array($decoded)) {
            throw new RuntimeException('Quran Foundation fixture ['.$name.'] must be a JSON object.');
        }

        /** @var array<string, mixed> $decoded */
        return $decoded;
    }

    public static function forgetBindings(): void
    {
        app()->forgetInstance(QfConfig::class);
        app()->forgetInstance(QfHttp::class);
        app()->forgetInstance(OAuthTokenProvider::class);
        app()->forgetInstance(ContentSyncClient::class);
    }
}
