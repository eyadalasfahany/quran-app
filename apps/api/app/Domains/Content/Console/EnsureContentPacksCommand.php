<?php

declare(strict_types=1);

namespace App\Domains\Content\Console;

use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Packs\PackBuildException;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

final class EnsureContentPacksCommand extends Command
{
    protected $signature = 'content:ensure-packs
                            {--prune-orphans : Delete content_packs rows whose gzip file is missing on disk before building}';

    protected $description = 'Build every active resource pack whose file is missing (Railway volume recovery).';

    public function handle(PackBuilder $packs): int
    {
        if ($this->option('prune-orphans')) {
            $pruned = $this->pruneOrphanPackRows();
            $this->line("Pruned {$pruned} orphaned pack row(s).");
        }

        $built = 0;
        $skipped = 0;
        $failed = 0;

        $resources = Resource::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->get();

        foreach ($resources as $resource) {
            $label = (string) $resource->id;
            $existing = ContentPack::query()
                ->where('resource_id', $resource->id)
                ->where('version', $resource->version)
                ->first();

            if ($existing instanceof ContentPack && Storage::disk('local')->exists($existing->path)) {
                $skipped++;

                continue;
            }

            try {
                $pack = $packs->build($resource);
                $this->line("OK {$label} v{$pack->version} {$pack->sizeBytes} bytes");
                $built++;
            } catch (PackBuildException $exception) {
                $this->error("FAIL {$label}: {$exception->getMessage()}");
                $failed++;
            }
        }

        $this->line("Done: built={$built}, skipped={$skipped}, failed={$failed}");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    private function pruneOrphanPackRows(): int
    {
        $pruned = 0;

        foreach (ContentPack::query()->cursor() as $pack) {
            if (! Storage::disk('local')->exists($pack->path)) {
                $pack->delete();
                $pruned++;
            }
        }

        return $pruned;
    }
}
