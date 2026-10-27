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
    }
}
