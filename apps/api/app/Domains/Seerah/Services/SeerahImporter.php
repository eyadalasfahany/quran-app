<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Services;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\TextDirection;
use App\Domains\Content\Jobs\BuildContentPackJob;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Packs\PackBuildException;
use App\Domains\Content\Repositories\Contracts\ResourceRepository;
use App\Domains\Seerah\Canonical\CanonicalBuild;
use App\Domains\Seerah\Enums\ImportMode;
use App\Domains\Seerah\Exceptions\SeerahImportException;
use App\Domains\Seerah\Exceptions\SeerahImportLockedException;
use App\Domains\Seerah\Exceptions\SeerahIntegrityException;
use App\Domains\Seerah\Import\SeerahImportGuard;
use App\Domains\Seerah\Import\SeerahImportResult;
use App\Domains\Seerah\Import\SeerahRowBuilder;
use App\Domains\Seerah\Repositories\Contracts\SeerahImportRepository;
use App\Domains\Seerah\Validation\SeerahValidator;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Imports the reviewed Seerah data into the seerah_* tables (ADR 0091, Phase 8 step 23). The validator runs first and an error
 * writes nothing. One transaction replaces the book's rows, bumps the resource version and checks every stored paragraph against
 * the canonical text; a failed check rolls the whole import back. A re-run with the same fingerprint writes nothing. The pack is
 * built or queued after the commit, like hadith (ADR 0042).
 */
final class SeerahImporter
{
    public const string LOCK_KEY = 'seerah:import';

    private const int LOCK_SECONDS = 3600;

    private const string SOURCE_CODE = 'openiti';

    public function __construct(
        private readonly SeerahValidator $validator,
        private readonly SeerahRowBuilder $rows,
        private readonly SeerahImportGuard $guard,
        private readonly SeerahImportRepository $repository,
        private readonly ResourceRepository $resources,
        private readonly PackBuilder $packs,
    ) {}

    /**
     * @throws SeerahImportException When the options or the environment refuse the import
     * @throws SeerahImportLockedException When another import holds the lock
     * @throws SeerahIntegrityException When the stored text does not match the canonical text (the transaction is rolled back)
     */
    public function run(string $directory, ImportMode $mode, CanonicalBuild $build, bool $buildPacks, bool $deferPack, bool $production): SeerahImportResult
    {
        $this->guard->assertAllowed($production, $mode, $buildPacks, $deferPack);

        $lock = Cache::lock(self::LOCK_KEY, self::LOCK_SECONDS);

        if (! $lock->get()) {
            throw new SeerahImportLockedException('Another Seerah import is already running.');
        }

        try {
            return $this->write($directory, $mode, $build, $buildPacks, $deferPack);
        } finally {
            $lock->release();
        }
    }

    private function write(string $directory, ImportMode $mode, CanonicalBuild $build, bool $buildPacks, bool $deferPack): SeerahImportResult
    {
        $release = $mode === ImportMode::Release;
        $run = $this->validator->validate($directory, $build, $release, $release);

        if ($run->issues->hasErrors()) {
            return SeerahImportResult::refused($run->issues->all());
        }

        $rows = $this->rows->build($run, $build);
        $fingerprint = $rows->fingerprint();
        $sourceId = $this->sourceId();
        $slug = $this->slug();
        $title = (string) config('seerah.book.title_ar');
        $existing = $this->resources->findBySource($sourceId, ResourceGroup::Seerah, $slug);

        if ($existing !== null
            && $existing->import_fingerprint !== null
            && hash_equals($existing->import_fingerprint, $fingerprint)
            && $this->repository->hasBook($existing->id)
        ) {
            $pack = $buildPacks ? $this->pack($existing->id, true, false) : null;

            return SeerahImportResult::unchanged($existing->id, $existing->version, $rows->counts(), $pack, $run->issues->all());
        }

        $importedAt = CarbonImmutable::now('UTC');

        [$resourceId, $before, $after] = DB::transaction(function () use ($sourceId, $slug, $title, $build, $rows, $fingerprint, $importedAt): array {
            $resource = $this->resources->findBySource($sourceId, ResourceGroup::Seerah, $slug)
                ?? $this->resources->create([
                    'source_id' => $sourceId,
                    'group' => ResourceGroup::Seerah,
                    'source_key' => $slug,
                    'name' => $title,
                    'name_ar' => $title,
                    'language_code' => 'ar',
                    'direction' => TextDirection::Rtl,
                    'version' => 0,
                    'changes_floor_version' => 0,
                    'is_active' => true,
                ]);

            $before = $resource->version;
            $resource->version = $before + 1;
            // No change feed for the book: a client on an older version re-imports the pack (the hadith rule, ADR 0042).
            $resource->changes_floor_version = $resource->version;
            $resource->checksum = $build->canonicalSha256;
            $resource->import_fingerprint = $fingerprint;
            $resource->name = $title;
            $resource->name_ar = $title;
            $resource->is_active = true;
            $this->resources->save($resource);

            $this->repository->replace($resource->id, $rows, $sourceId, $importedAt);
            $this->assertIntegrity($resource->id, $build);

            return [$resource->id, $before, $resource->version];
        });

        $pack = $this->pack($resourceId, $buildPacks, $deferPack);

        return SeerahImportResult::imported($resourceId, $before, $after, $rows->counts(), $pack, $run->issues->all());
    }

    /**
     * Every stored paragraph must equal the canonical paragraph: its text, its SHA-256 and the count. Counts and numbers only.
     *
     * @throws SeerahIntegrityException
     */
    private function assertIntegrity(int $resourceId, CanonicalBuild $build): void
    {
        $stored = $this->repository->paragraphs($resourceId);
        $expected = $build->book->paragraphs;
        $mismatches = 0;

        foreach ($expected as $paragraph) {
            $row = $stored[(int) substr($paragraph->id, 1)] ?? null;

            if ($row === null
                || $row['text_ar'] !== $paragraph->text
                || ! hash_equals(hash('sha256', $paragraph->text), $row['text_sha256'])
            ) {
                $mismatches++;
            }
        }

        if ($mismatches > 0 || count($stored) !== count($expected)) {
            throw new SeerahIntegrityException(sprintf(
                'The stored paragraphs differ from the canonical text: %d mismatch(es), %d stored, %d expected.',
                $mismatches,
                count($stored),
                count($expected),
            ));
        }
    }

    /**
     * The pack after the commit: built now (--build-packs), neither built nor queued (--defer-pack, the web start builds it), or
     * queued (the default, as hadith does).
     *
     * @return array<string, bool|int|string>
     */
    private function pack(int $resourceId, bool $buildPacks, bool $deferPack): array
    {
        if ($buildPacks) {
            $resource = $this->resources->find($resourceId);

            if ($resource === null) {
                return ['built' => false, 'error' => 'resource_missing'];
            }

            try {
                $pack = $this->packs->build($resource);
            } catch (PackBuildException $exception) {
                return ['built' => false, 'error' => $exception::class];
            }

            return ['built' => true, 'version' => $pack->version, 'size_bytes' => $pack->sizeBytes, 'sha256' => $pack->sha256, 'row_count' => $pack->rowCount];
        }

        if ($deferPack) {
            return ['built' => false, 'queued' => false, 'deferred' => true];
        }

        BuildContentPackJob::dispatch($resourceId);

        return ['built' => false, 'queued' => true];
    }

    private function sourceId(): int
    {
        $sourceId = $this->resources->sourceId(self::SOURCE_CODE);

        if ($sourceId === null) {
            throw new \LogicException('The source ['.self::SOURCE_CODE.'] must be seeded before a Seerah import.');
        }

        return $sourceId;
    }

    private function slug(): string
    {
        return (string) config('seerah.book.slug');
    }
}
