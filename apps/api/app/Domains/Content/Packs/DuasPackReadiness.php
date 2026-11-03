<?php

declare(strict_types=1);

namespace App\Domains\Content\Packs;

use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Duas\Models\DuaHadith;

/**
 * ADR 0044-duas task 2b: a Duas pack that lists prophetic rows is built only when HadeethEnc is granted.
 */
final class DuasPackReadiness
{
    public function assertReady(int $resourceId): void
    {
        if (! DuaHadith::query()->where('resource_id', $resourceId)->exists()) {
            return;
        }

        $source = ContentSource::query()->where('code', 'hadeethenc')->first();

        if ($source?->permission_status !== PermissionStatus::Granted) {
            throw new PackBuildException(
                'Duas prophetic content is present but the hadeethenc source is not granted. The pack is not built.',
            );
        }
    }
}
