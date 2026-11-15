<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Console;

use App\Domains\Content\Packs\PackBuildException;
use App\Domains\Mushaf\Exceptions\SvgMushafException;
use App\Domains\Mushaf\Services\SvgMushafPublisher;
use Illuminate\Console\Command;

final class PublishSvgMushafCommand extends Command
{
    protected $signature = 'mushaf:publish
        {key : the riwayah key, for example hafs}
        {--defer-pack : queue the pack build instead of building it now}
        {--without-word-boxes : publish pages and regions only (local and test use; refused in production)}';

    protected $description = 'Publish an imported SVG mushaf as a content resource and build its pack (ADR 0090).';

    public function handle(SvgMushafPublisher $publisher): int
    {
        try {
            $resource = $publisher->publish(
                (string) $this->argument('key'),
                (bool) $this->option('defer-pack'),
                (bool) $this->option('without-word-boxes'),
            );
        } catch (SvgMushafException|PackBuildException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->line(sprintf('Published [%s] as version %d.', (string) $this->argument('key'), $resource->version));
        $this->line('has_word_boxes: '.($publisher->includesWordBoxes((string) $this->argument('key')) ? 'yes' : 'no'));

        return self::SUCCESS;
    }
}
