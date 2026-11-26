<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Packs;

use App\Domains\Content\Data\ContentPackData;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuildException;
use App\Domains\Content\Packs\PackSchema;
use App\Domains\Content\Repositories\Contracts\ContentPackRepository;
use App\Domains\Mushaf\Exceptions\SvgMushafSourceException;
use App\Domains\Mushaf\Models\SvgMushaf;
use App\Domains\Mushaf\Packs\Tqp\TqpPageBlob;
use App\Domains\Mushaf\Repositories\Contracts\SvgMushafPackRepository;
use App\Domains\Mushaf\Services\WordBoxApproval;
use App\Domains\Mushaf\Services\WordContourApproval;
use App\Domains\Mushaf\Sources\SvgMushafDownloader;
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
    /** The page encoding the pack carries (ADR 0090 amendment of 26 Nov 2026). Part of the publish fingerprint. */
    public const string FORMAT = 'tqp1-deflate-n32';

    public function __construct(
        private readonly SvgMushafPackRepository $mushafs,
        private readonly ContentPackRepository $packs,
        private readonly SvgMushafDownloader $downloader,
    ) {}

    /**
     * @param  bool  $withPendingContours  the local-only flag of `mushaf:publish --with-pending-contours`: writes a map pending review
     */
    public function build(Resource $resource, bool $withPendingContours = false): ContentPackData
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
        $contours = WordContourApproval::writes($mushaf, $withPendingContours);
        $temp = storage_path('app/tmp/svg-mushaf-'.$resource->id.'-'.$resource->version.'-'.bin2hex(random_bytes(8)).'.sqlite');
        $path = 'packs/'.$resource->id.'/'.$resource->version.'.sqlite';
        $writer = null;
        $stored = false;

        try {
            $builtAt = CarbonImmutable::now('UTC');
            $writer = SvgMushafPackWriter::create($temp);
            $rowCount = $this->write($writer, $resource, $mushaf, $approved, $contours, $builtAt);
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
    private function write(SvgMushafPackWriter $writer, Resource $resource, SvgMushaf $mushaf, bool $approved, bool $contours, CarbonImmutable $builtAt): int
    {
        $writer->begin();
        $writer->createSchema();

        $meta = [
            'pack_schema_version' => (string) PackSchema::SVG_MUSHAF_VERSION,
            'resource_id' => (string) $resource->id,
            'group' => $resource->group->value,
            'version' => (string) $resource->version,
            'built_at' => $builtAt->toIso8601ZuluString('millisecond'),
            'mushaf_key' => $mushaf->key,
            'edition_year' => (string) $mushaf->edition_year,
            'source_commit' => $mushaf->source_commit,
            'page_count' => (string) $mushaf->page_count,
            'has_word_boxes' => $approved ? '1' : '0',
            'has_word_contours' => $contours ? '1' : '0',
            'page_format' => self::FORMAT,
        ];

        if ($approved) {
            $meta['word_boxes_digest'] = (string) $mushaf->word_boxes_digest;
        }

        if ($contours) {
            $meta['word_contours_digest'] = (string) $mushaf->contours_digest;
        }

        $writer->writeMeta($meta);

        $rowCount = 0;

        foreach ($this->mushafs->pages($mushaf->id) as $page) {
            $encoded = TqpPageBlob::build($this->pageSvg((string) $mushaf->folder, $page['page']));

            if ($page['tqp_sha256'] === null || ! hash_equals($page['tqp_sha256'], $encoded['container_sha256'])) {
                throw new PackBuildException(sprintf('Page %d: the encoded page changed since import. Run mushaf:import.', $page['page']));
            }

            $writer->insertPage($page['page'], $encoded['blob'], $encoded['origin_x'], $encoded['origin_y']);
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

        if ($contours) {
            foreach ($this->mushafs->wordContours($mushaf->id) as $run) {
                $writer->insertWordContour($run);
                $rowCount++;
            }

            foreach ($this->mushafs->contourBlocks($mushaf->id) as $block) {
                $writer->insertContourBlock($block);
                $rowCount++;
            }
        }

        $writer->commit();

        return $rowCount;
    }

    /**
     * The cached raw page, checked by A1 on every read. A changed or missing file is a stale import, not a build failure.
     */
    private function pageSvg(string $folder, int $page): string
    {
        try {
            return $this->downloader->bytes($folder, sprintf('svg/%03d.svg', $page), true);
        } catch (SvgMushafSourceException) {
            throw new PackBuildException(sprintf('Page %d of the SVG mushaf is missing or changed in the source cache. Run mushaf:import.', $page));
        }
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
            'schema_version' => PackSchema::SVG_MUSHAF_VERSION,
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
