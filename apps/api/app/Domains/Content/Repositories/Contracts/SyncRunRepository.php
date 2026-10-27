<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Contracts;

use App\Domains\Content\Models\SyncRun;

interface SyncRunRepository
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): SyncRun;

    public function save(SyncRun $run): void;
}
