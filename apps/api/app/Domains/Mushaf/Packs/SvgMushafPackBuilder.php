<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Packs;

use App\Domains\Content\Data\ContentPackData;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuildException;
use App\Domains\Content\Packs\PackSchema;
use App\Domains\Content\Repositories\Contracts\ContentPackRepository;
use App\Domains\Mushaf\Models\SvgMushaf;
use App\Domains\Mushaf\Repositories\Contracts\SvgMushafPackRepository;
use App\Domains\Mushaf\Services\WordBoxApproval;
use App\Domains\Mushaf\Sources\SvgMushafDownloader;
use App\Domains\Mushaf\Sources\SvgMushafStore;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Builds the pack of one SVG mushaf (ADR 0090 decision 5). The pack is a plain SQLite file, served uncompressed. Page bytes are
 * copied from the source cache unchanged, after their digest is checked against the import.
 */
final class SvgMushafPackBuilder
{
    public function __construct(
        private readonly SvgMushafPackRepository $mushafs,
        private readonly ContentPackRepository $packs,
        private readonly SvgMushafStore $store,
        private readonly SvgMushafDownloader $downloader,
    ) {}

    public function build(Resource $resource): ContentPackData
    {
        $existing = $this->packs->findForVersion($resource->id, $resource->version);

        if ($existing !== null) {
            if (Storage::disk('local')->exists($existing->path)) {
                return $this->data($existing);
            }

            // DB row without a file (ephemeral disk after deploy). Drop the row so build can record again.
            $existing->delete();
        }

        $mushaf = $this->mushafs->findByKey((string) $resource->source_key);

        if (! $mushaf instanceof SvgMushaf || $mushaf->page_count !== (int) config('mushaf.pages')) {
            throw new PackBuildException('The SVG mushaf is not imported. The pack is not built.');
        }

        $approved = WordBoxApproval::isApproved($mushaf);
        $temp = storage_path('app/tmp/svg-mushaf-'.$resource->id.'-'.$resource->version.'-'.bin2hex(random_bytes(8)).'.sqlite');
        $path = 'packs/'.$resource->id.'/'.$resource->version.'.sqlite';
        $writer = null;
        $stored = false;

        try {
            $builtAt = CarbonImmutable::now('UTC');
            $writer = SvgMushafPackWriter::create($temp);
            $rowCount = $this->write($writer, $resource, $mushaf, $approved, $builtAt);
            $writer->close();
            $writer = null;

            $this->store($path, $temp);
            $stored = true;

            $pack = $this->record($resource, $path, $temp, $rowCount, $builtAt, $approved);

            return $this->data($pack);
        } catch (UniqueConstraintViolationException) {
            $pack = $this->packs->findForVersion($resource->id, $resource->version);

            if ($pack === null) {
                $this->deleteUnrecorded($path, $resource);

                throw new PackBuildException('Could not record the content pack.');
            }

            return $this->data($pack);
        } catch (PackBuildException $exception) {
            if ($stored) {
                $this->deleteUnrecorded($path, $resource);
            }

            throw $exception;
        } catch (Throwable $exception) {
            if ($stored) {
                $this->deleteUnrecorded($path, $resource);
            }

            throw new PackBuildException('Could not build the content pack.', previous: $exception);
        } finally {
            $writer?->close();

            if (is_file($temp)) {
                unlink($temp);
            }
        }
    }

    /**
     * @return int<0, max> the rows written
     */
    private function write(SvgMushafPackWriter $writer, Resource $resource, SvgMushaf $mushaf, bool $approved, CarbonImmutable $builtAt): int
    {
        $writer->begin();
        $writer->createSchema();

        $meta = [
            'pack_schema_version' => (string) PackSchema::VERSION,
            'resource_id' => (string) $resource->id,
            'group' => $resource->group->value,
            'version' => (string) $resource->version,
            'built_at' => $builtAt->toIso8601ZuluString('millisecond'),
            'mushaf_key' => $mushaf->key,
            'edition_year' => (string) $mushaf->edition_year,
            'source_commit' => $mushaf->source_commit,
            'page_count' => (string) $mushaf->page_count,
            'has_word_boxes' => $approved ? '1' : '0',
        ];

        if ($approved) {
            $meta['word_boxes_digest'] = (string) $mushaf->word_boxes_digest;
        }

        $writer->writeMeta($meta);

        $rowCount = 0;
        $base = $this->downloader->base((string) $mushaf->folder);

        foreach ($this->mushafs->pages($mushaf->id) as $page) {
            $relative = sprintf('svg/%03d.svg.gz', $page['page']);

            if (! $this->store->has($base, $relative)) {
                throw new PackBuildException(sprintf('Page %d of the SVG mushaf is missing or changed in the source cache. Run mushaf:import.', $page['page']));
            }

            $bytes = $this->store->read($base, $relative);

            if (strlen($bytes) !== $page['gz_bytes'] || ! hash_equals($page['gz_sha256'], hash('sha256', $bytes))) {
                throw new PackBuildException(sprintf('Page %d of the SVG mushaf is missing or changed in the source cache. Run mushaf:import.', $page['page']));
            }

            $writer->insertPage($page['page'], $bytes);
            $rowCount++;
        }

        foreach ($this->mushafs->regions($mushaf->id) as $region) {
            $writer->insertRegion($region);
            $rowCount++;
        }

        if ($approved) {
            foreach ($this->mushafs->wordBoxes($mushaf->id) as $box) {
                $writer->insertWordBox($box);
                $rowCount++;
            }
        }

        $writer->commit();

        return $rowCount;
    }

    private function store(string $path, string $temp): void
    {
        $stream = fopen($temp, 'rb');

        if ($stream === false) {
            throw new PackBuildException('Could not read the temporary pack.');
        }

        try {
            $written = Storage::disk('local')->writeStream($path, $stream);
        } catch (Throwable $exception) {
            throw new PackBuildException('Could not store the content pack.', previous: $exception);
        } finally {
            fclose($stream);
        }

        if ($written !== true) {
            Storage::disk('local')->delete($path);

            throw new PackBuildException('Could not store the content pack.');
        }
    }

    private function record(Resource $resource, string $path, string $temp, int $rowCount, CarbonImmutable $builtAt, bool $approved): ContentPack
    {
        return $this->packs->create([
            'resource_id' => $resource->id,
            'version' => $resource->version,
            'path' => $path,
            'size_bytes' => (int) filesize($temp),
            'sha256' => (string) hash_file('sha256', $temp),
            'row_count' => $rowCount,
            'schema_version' => PackSchema::VERSION,
            'built_at' => $builtAt,
            'has_word_boxes' => $approved,
        ]);
    }

    private function deleteUnrecorded(string $path, Resource $resource): void
    {
        if ($this->packs->findForVersion($resource->id, $resource->version) !== null) {
            return;
        }

        Storage::disk('local')->delete($path);
    }

    private function data(ContentPack $pack): ContentPackData
    {
        return new ContentPackData(
            resourceId: $pack->resource_id,
            version: $pack->version,
            path: $pack->path,
            sizeBytes: $pack->size_bytes,
            sha256: $pack->sha256,
            rowCount: $pack->row_count,
            schemaVersion: $pack->schema_version,
            builtAt: $pack->built_at,
        );
    }
}
