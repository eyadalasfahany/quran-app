<?php

declare(strict_types=1);

namespace App\Domains\Names\Services;

use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use App\Domains\Names\Exceptions\NamesSourceLockedException;

/**
 * ADR 0043 A2: Names import and pack build require a granted content_sources row (mirror of ADR 0031 §1 for OpenDua).
 */
final class NamesSourceGate
{
    public function isGranted(?ContentSource $source): bool
    {
        return $source !== null && $source->permission_status === PermissionStatus::Granted;
    }

    public function assertGrantedForResource(Resource $resource): void
    {
        if ($resource->group !== ResourceGroup::Names) {
            return;
        }

        $resource->loadMissing('source');

        if ($this->isGranted($resource->source)) {
            return;
        }

        throw new NamesSourceLockedException('The Names content source is not granted. Complete step N1 and run the grant migration (ADR 0043).');
    }

    public function assertGrantedForImport(): void
    {
        $code = config('names.source_code');

        if (! is_string($code) || $code === '') {
            throw new NamesSourceLockedException('Names source code is not configured.');
        }

        $source = ContentSource::query()->where('code', $code)->first();

        if ($this->isGranted($source)) {
            return;
        }

        throw new NamesSourceLockedException('The Names content source ['.$code.'] is pending. Import is refused until granted (ADR 0043).');
    }
}
