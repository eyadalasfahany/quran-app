<?php

declare(strict_types=1);

namespace App\Support\Repositories;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Base for every domain's Eloquent repository. Repositories own persistence only:
 * no transactions and no business rules (those live in services).
 *
 * @template TModel of Model
 */
abstract class EloquentRepository
{
    /**
     * @return class-string<TModel>
     */
    abstract protected function model(): string;

    /**
     * @return Builder<TModel>
     */
    protected function query(): Builder
    {
        return $this->model()::query();
    }
}
