<?php

declare(strict_types=1);

namespace App\Domains\Content\Console;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Services\ContentSyncService;
use Illuminate\Console\Command;
use Throwable;

final class SyncContentCommand extends Command
{
    protected $signature = 'content:sync {group} {--resources=}';

    protected $description = 'Sync one Quran Foundation resource group and print the run summary.';

    public function handle(ContentSyncService $sync): int
    {
        $group = ResourceGroup::tryFrom((string) $this->argument('group'));

        if ($group === null) {
            $this->error('Unknown resource group.');

            return self::FAILURE;
        }

        $filter = $this->option('resources');

        if (! is_string($filter) || $filter === '') {
            $configured = config('quran.sync.groups.'.$group->value);

            if (! is_string($configured) || $configured === '') {
                $this->error('No resources filter is configured for this group.');

                return self::FAILURE;
            }

            $filter = $configured;
        }

        try {
            $result = $sync->run($group, $filter);
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->line('mutations_applied: '.$result->mutationsApplied);
        $this->line('resources_touched: '.$result->resourcesTouched);
        $this->line('rows: '.$result->rows);

        return self::SUCCESS;
    }
}
