<?php

declare(strict_types=1);

namespace App\Domains\Azkar;

use App\Domains\Azkar\Contracts\HadithReferenceSource;
use App\Domains\Azkar\Sources\DorarHadithReferenceSource;
use App\Domains\Azkar\Sources\NullHadithReferenceSource;
use App\Integrations\Dorar\DorarConfig;
use App\Integrations\Dorar\DorarResponseMapper;
use Illuminate\Support\ServiceProvider;

/**
 * Chooses the hadith reference source (ADR 0031 §2). Dorar is wired only when it is configured and enabled.
 */
final class AzkarServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(HadithReferenceSource::class, function (): HadithReferenceSource {
            if (! $this->app->make(DorarConfig::class)->isAvailable()) {
                return new NullHadithReferenceSource;
            }

            return new DorarHadithReferenceSource(new DorarResponseMapper);
        });
    }
}
