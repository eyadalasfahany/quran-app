<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Storage;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Sync tests fire ResourceContentChanged, and the sync queue then builds packs at once.
        // A fake disk keeps those packs out of the real storage/app/private/packs.
        Storage::fake('local');

        // Tests write to and delete the source cache. Point it at a per-process temp folder so no test can ever touch the
        // developer's real cache in storage/app/private/sources (a hadith test once deleted it).
        config(['content_sources.cache_root' => storage_path('framework/testing/sources-'.getmypid())]);

        // The committed hadith data files (database/data/hadith) are real content. Tests start with no pins, so the importer
        // never mixes them into placeholder fixtures; a test that needs a data file pins its own fixture.
        config(['hadith.data_files' => []]);
    }
}
