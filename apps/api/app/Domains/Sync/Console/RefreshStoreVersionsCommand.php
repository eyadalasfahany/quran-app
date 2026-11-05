<?php

declare(strict_types=1);

namespace App\Domains\Sync\Console;

use App\Domains\Sync\Enums\AppPlatform;
use App\Domains\Sync\Repositories\Contracts\LatestStoreVersionRepository;
use App\Domains\Sync\Services\StoreVersionRefreshService;
use Illuminate\Console\Command;

final class RefreshStoreVersionsCommand extends Command
{
    protected $signature = 'app-stores:refresh';

    protected $description = 'Look up the live app version in the App Store and Play Store and store it for /bootstrap.';

    public function handle(StoreVersionRefreshService $refresh, LatestStoreVersionRepository $versions): int
    {
        $refresh->refresh();

        foreach (AppPlatform::cases() as $platform) {
            $this->line($platform->value.': '.($versions->get($platform) ?? 'none'));
        }

        return self::SUCCESS;
    }
}
