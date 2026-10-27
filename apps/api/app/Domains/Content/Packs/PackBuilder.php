<?php

declare(strict_types=1);

namespace App\Domains\Content\Packs;

use App\Domains\Content\Data\ContentPackData;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Repositories\Contracts\ContentPackRepository;
use App\Domains\Content\Repositories\Contracts\PackSnapshotRepository;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Storage;
use Throwable;

final class PackBuilder
{
    public function __construct(
        private readonly PackSnapshotRepository $snapshots,
        private readonly ContentPackRepository $packs,
    ) {}

    public function build(Resource $resource): ContentPackData
    {
        $existing = $this->packs->findForVersion($resource->id, $resource->version);

        if ($existing !== null) {
            return $this->data($existing);
        }

        $temp = storage_path('app/tmp/pack-'.$resource->id.'-'.$resource->version.'-'.bin2hex(random_bytes(8)).'.sqlite');
        $path = 'packs/'.$resource->id.'/'.$resource->version.'.sqlite.gz';
        $writer = null;
        $stored = false;

        try {
            $builtAt = CarbonImmutable::now('UTC');
            $writer = SqlitePackWriter::create($temp);
            $rowCount = $this->write($writer, $resource, $builtAt);
            $writer->close();
            $writer = null;

            $gzipped = $this->gzip($temp);
            $this->store($path, $gzipped);
            $stored = true;

            $pack = $this->record($resource, $path, $gzipped, $rowCount, $builtAt);

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

    private function write(SqlitePackWriter $writer, Resource $resource, CarbonImmutable $builtAt): int
    {
        $writer->begin();
        $writer->writeMeta([
            'pack_schema_version' => (string) PackSchema::VERSION,
            'resource_id' => (string) $resource->id,
            'group' => $resource->group->value,
            'version' => (string) $resource->version,
            'built_at' => $builtAt->toIso8601ZuluString('millisecond'),
        ]);

        $rowCount = 0;

        foreach (PackSchema::tablesFor($resource->group) as $table) {
            $writer->createTable($table);
            $this->snapshots->eachChunk($resource->id, $table, function (array $rows) use ($writer, $table, &$rowCount): void {
                foreach ($rows as $row) {
                    $writer->insert($table, $row);
                    $rowCount++;
                }
            });
        }

        $writer->commit();
        $writer->vacuum();

        return $rowCount;
    }

    private function gzip(string $temp): string
    {
        $bytes = file_get_contents($temp);

        if ($bytes === false) {
            throw new PackBuildException('Could not read the temporary pack.');
        }

        $gzipped = gzencode($bytes, 9);

        if ($gzipped === false) {
            throw new PackBuildException('Could not compress the pack.');
        }

        return $gzipped;
    }

    private function store(string $path, string $gzipped): void
    {
        try {
            $written = Storage::disk('local')->put($path, $gzipped);
        } catch (Throwable $exception) {
            throw new PackBuildException('Could not store the content pack.', previous: $exception);
        }

        if ($written !== true) {
            Storage::disk('local')->delete($path);

            throw new PackBuildException('Could not store the content pack.');
        }
    }

    private function record(Resource $resource, string $path, string $gzipped, int $rowCount, CarbonImmutable $builtAt): ContentPack
    {
        return $this->packs->create([
            'resource_id' => $resource->id,
            'version' => $resource->version,
            'path' => $path,
            'size_bytes' => strlen($gzipped),
            'sha256' => hash('sha256', $gzipped),
            'row_count' => $rowCount,
            'schema_version' => PackSchema::VERSION,
            'built_at' => $builtAt,
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
