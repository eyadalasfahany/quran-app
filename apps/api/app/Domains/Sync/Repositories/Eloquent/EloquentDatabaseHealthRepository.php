<?php

declare(strict_types=1);

namespace App\Domains\Sync\Repositories\Eloquent;

use App\Domains\Sync\Repositories\Contracts\DatabaseHealthRepository;
use App\Models\User;
use App\Support\Repositories\EloquentRepository;
use Illuminate\Database\QueryException;

/**
 * Reads through the users table Laravel ships, so the check needs no table of its own.
 *
 * @extends EloquentRepository<User>
 */
final class EloquentDatabaseHealthRepository extends EloquentRepository implements DatabaseHealthRepository
{
    public function isReachable(): bool
    {
        try {
            $this->query()->exists();

            return true;
        } catch (QueryException) {
            return false;
        }
    }

    protected function model(): string
    {
        return User::class;
    }
}
