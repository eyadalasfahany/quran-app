<?php

declare(strict_types=1);

use App\Domains\Content\Mp3Quran\Mp3QuranManifest;
use App\Domains\Content\Mp3Quran\Mp3QuranManifestException;
use App\Domains\Content\Mp3Quran\ReciterSource;

// The ingest tool writes this fixture from a dry run against its fake Way2Quran host (ADR 0074 step 5). The PHP
// parser must accept it unchanged, so the two sides cannot drift apart.
it('accepts the manifest the ingest tool writes for a way2quran reciter', function (): void {
    $path = dirname(__DIR__, 5).'/tools/mp3quran-ingest/tests/fixtures/way2quran-manifest-3.json';

    expect(is_file($path))->toBeTrue();

    $data = (new Mp3QuranManifest(ReciterSource::way2quran()))->load($path);

    expect($data->invalid)->toBe([])
        ->and($data->moshafs)->toHaveCount(1)
        ->and($data->moshafs[0]->moshafId)->toBe(1)
        ->and(array_map(fn ($file): int => $file->surah, $data->moshafs[0]->files))->toBe([1, 12, 79]);
});

it('refuses that manifest under the mp3quran profile', function (): void {
    $path = dirname(__DIR__, 5).'/tools/mp3quran-ingest/tests/fixtures/way2quran-manifest-3.json';

    (new Mp3QuranManifest(ReciterSource::mp3quran()))->load($path);
})->throws(Mp3QuranManifestException::class);
