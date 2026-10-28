<?php

declare(strict_types=1);

namespace App\Integrations\QuranFoundation;

use Illuminate\Console\Command;

final class PingQuranFoundationCommand extends Command
{
    protected $signature = 'qf:ping';

    protected $description = 'Check Quran Foundation access and print only the environment, status, and counts.';

    public function handle(ContentSyncClient $client, QfConfig $config): int
    {
        $mutations = 0;
        $records = 0;
        $status = 200;

        try {
            $snapshotUrl = null;

            foreach ($client->sync(resources: 'tafsirs:16', bootstrap: true) as $page) {
                $mutations += count($page->mutations);

                foreach ($page->mutations as $mutation) {
                    if ($snapshotUrl !== null) {
                        continue;
                    }

                    if ($mutation->type !== MutationType::ResourceCreate) {
                        continue;
                    }

                    if ($mutation->snapshotUrl === null || $mutation->snapshotUrl === '') {
                        continue;
                    }

                    $snapshotUrl = $mutation->snapshotUrl;
                }
            }

            if ($snapshotUrl === null) {
                throw new QuranFoundationException('Quran Foundation sync returned no snapshot URL.');
            }

            $records = count($client->snapshot($snapshotUrl)->records);
        } catch (QuranFoundationException $exception) {
            $this->report($config->environment->value, $exception->status ?? 0, $mutations, 0);

            return self::FAILURE;
        }

        $this->report($config->environment->value, $status, $mutations, $records);

        return self::SUCCESS;
    }

    private function report(string $environment, int $status, int $mutations, int $records): void
    {
        $this->line('environment: '.$environment);
        $this->line('http: '.$status);
        $this->line('mutations: '.$mutations);
        $this->line('snapshot_records: '.$records);
    }
}
