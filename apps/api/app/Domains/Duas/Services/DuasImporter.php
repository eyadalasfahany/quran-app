<?php

declare(strict_types=1);

namespace App\Domains\Duas\Services;

use App\Domains\Azkar\Data\ImportIssue;
use App\Domains\Azkar\Data\ImportReport;
use App\Domains\Azkar\Exceptions\SnapshotException;
use App\Domains\Azkar\Sources\HadeethEncSnapshot;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\TextDirection;
use App\Domains\Content\Jobs\BuildContentPackJob;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Repositories\Contracts\ResourceRepository;
use App\Domains\Duas\Data\DuasImportPlan;
use App\Domains\Duas\Repositories\Contracts\DuasImportRepository;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Imports Duas content from the reviewed Quran map and an optional pinned HadeethEnc snapshot (ADR 0044-duas §6).
 */
final class DuasImporter
{
    private const string LOCK_KEY = 'duas:import';

    private const string RESOURCE_KEY = 'ar-duas';

    public function __construct(
        private readonly DuasImportPlanner $planner,
        private readonly DuasImportFingerprint $fingerprints,
        private readonly ResourceRepository $resources,
        private readonly DuasImportRepository $duas,
        private readonly PackBuilder $packs,
        private readonly HadeethEncSnapshot $hadeethSnapshot,
        private readonly HadeethEncDuasGroupBuilder $hadithGroups,
    ) {}

    /**
     * @throws \LogicException
     * @throws LockTimeoutException
     */
    public function run(
        bool $dryRun = false,
        bool $buildPacks = false,
        bool $deferPack = false,
        bool $useLock = true,
    ): ImportReport {
        if ($buildPacks && $deferPack) {
            throw new \LogicException('Choose --build-packs or --defer-pack, not both.');
        }

        $lock = $useLock ? Cache::lock(self::LOCK_KEY, 3600) : null;

        if ($lock !== null && ! $lock->get()) {
            throw new LockTimeoutException('Another Duas import is already running.');
        }

        try {
            return $this->execute($dryRun, $buildPacks, $deferPack);
        } finally {
            $lock?->release();
        }
    }

    private function execute(bool $dryRun, bool $buildPacks, bool $deferPack): ImportReport
    {
        $now = CarbonImmutable::now('UTC');
        $issues = [];
        $hadithRecords = [];
        $hadithGroupRows = [];
        $hadithPrimaryGroup = [];
        $snapshotManifestSha = '';
        $hadithSkipReason = null;

        $snapshotDir = $this->snapshotDirectory();

        if ($snapshotDir !== null) {
            try {
                $hadithRecords = $this->hadeethSnapshot->load($snapshotDir, 'duas.hadeethenc');
                $manifest = json_decode((string) file_get_contents($snapshotDir.DIRECTORY_SEPARATOR.'manifest.json'), true, 512, JSON_THROW_ON_ERROR);
                $snapshotManifestSha = is_array($manifest) && is_string($manifest['sha256'] ?? null) ? $manifest['sha256'] : '';

                if ($hadithRecords !== []) {
                    $built = $this->hadithGroups->build($snapshotDir);
                    $hadithGroupRows = $built['groups'];
                    $hadithPrimaryGroup = $built['hadithPrimaryGroup'];
                }
            } catch (SnapshotException $exception) {
                $issues[] = new ImportIssue(ImportIssue::ERROR, 'snapshot_invalid', 'hadeethenc');
                $hadithSkipReason = $exception->getMessage();
            }
        } else {
            $hadithSkipReason = 'no_snapshot_configured';
        }

        $quranMap = config('duas_quran_map', []);

        if (! is_array($quranMap)) {
            $quranMap = [];
        }

        $hisnLinks = $this->optionalConfigArray('duas_hadeethenc_links');
        $collectionRefs = $this->optionalConfigArray('duas_collection_refs');
        $collectionBooks = config('duas.collection_books', []);

        if (! is_array($collectionBooks)) {
            $collectionBooks = [];
        }

        $sourceId = $this->resources->sourceId('hadeethenc');

        if ($sourceId === null) {
            $issues[] = new ImportIssue(ImportIssue::ERROR, 'source_missing', 'hadeethenc');
        }

        $hadeethSourceVersion = (string) config('duas.hadeethenc.snapshot_date', '');

        $planned = $this->planner->plan(
            quranMap: $quranMap,
            hisnLinks: $hisnLinks,
            collectionRefs: $collectionRefs,
            collectionBooks: $collectionBooks,
            hadithRecords: $hadithRecords,
            importedAt: $now,
            hadeethSourceId: $sourceId ?? 0,
            hadeethSourceVersion: $hadeethSourceVersion,
            hadithGroups: $hadithGroupRows,
            hadithPrimaryGroup: $hadithPrimaryGroup,
        );

        $plan = $planned['plan'];
        $issues = [...$issues, ...$planned['issues']];

        $hasErrors = $this->hasErrors($issues);
        $status = $hasErrors ? ImportReport::STATUS_INVALID : ImportReport::STATUS_VALID;
        $fingerprint = $this->fingerprints->of($plan, $snapshotManifestSha);

        $existing = $sourceId === null ? null : $this->resources->findBySource($sourceId, ResourceGroup::Duas, self::RESOURCE_KEY);

        $resource = [
            'group' => ResourceGroup::Duas->value,
            'source_key' => self::RESOURCE_KEY,
            'version_before' => $existing instanceof Resource ? $existing->version : 0,
            'version_after' => null,
            'fingerprint' => $fingerprint,
        ];

        if (! $dryRun && ! $hasErrors && $sourceId !== null) {
            if ($existing instanceof Resource && $existing->import_fingerprint !== null && hash_equals($existing->import_fingerprint, $fingerprint)) {
                $status = ImportReport::STATUS_UNCHANGED;
                $resource['id'] = $existing->id;
                $resource['version_after'] = $existing->version;
                $resource['pack'] = ['built' => false, 'queued' => false, 'reason' => 'unchanged'];
            } else {
                $resource = [...$resource, ...$this->write($plan, $sourceId, $fingerprint, $buildPacks, $deferPack)];
                $status = ImportReport::STATUS_IMPORTED;
            }
        }

        return new ImportReport(
            generatedAt: $now->toIso8601String(),
            dryRun: $dryRun,
            status: $status,
            source: [
                'quran_map_keys' => count($quranMap),
                'hadith_snapshot' => $snapshotDir,
                'hadith_skip_reason' => $hadithSkipReason,
            ],
            content: [
                'quran_accepted' => $plan->stats->quranAccepted,
                'quran_skipped' => $plan->stats->quranSkipped,
                'quran_blocked' => $plan->stats->quranBlocked,
                'hadith_accepted' => $plan->stats->hadithAccepted,
                'links_accepted' => $plan->stats->linksAccepted,
                'refs_accepted' => $plan->stats->refsAccepted,
                'books_accepted' => $plan->stats->booksAccepted,
                'items_total' => count($plan->items),
            ],
            sourced: [],
            gated: ['hadith' => ['records' => count($hadithRecords), 'skip_reason' => $hadithSkipReason]],
            changedUpstreamTexts: ['count' => 0, 'keys' => []],
            resource: $resource,
            issues: array_map(
                static fn (ImportIssue $issue): array => [
                    'severity' => $issue->severity,
                    'code' => $issue->code,
                    'path' => $issue->path,
                    'entry' => $issue->entryKey,
                ],
                $issues,
            ),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function write(DuasImportPlan $plan, int $sourceId, string $fingerprint, bool $buildPacks, bool $deferPack): array
    {
        return DB::transaction(function () use ($plan, $sourceId, $fingerprint, $buildPacks, $deferPack): array {
            $resource = $this->resources->findBySource($sourceId, ResourceGroup::Duas, self::RESOURCE_KEY)
                ?? $this->resources->create([
                    'source_id' => $sourceId,
                    'group' => ResourceGroup::Duas,
                    'source_key' => self::RESOURCE_KEY,
                    'name' => self::RESOURCE_KEY,
                    'language_code' => 'ar',
                    'direction' => TextDirection::Rtl,
                    'version' => 0,
                    'changes_floor_version' => 0,
                    'is_active' => true,
                ]);

            $before = $resource->version;
            $resource->version = $before + 1;
            $resource->changes_floor_version = $resource->version;
            $resource->import_fingerprint = $fingerprint;
            $resource->is_active = true;
            $this->resources->save($resource);

            $this->duas->replaceForResource($resource->id, $plan);

            $pack = ['built' => false, 'queued' => false, 'reason' => null];

            if ($buildPacks) {
                $this->packs->build($resource);
                $pack = ['built' => true, 'queued' => false, 'reason' => null];
            } elseif (! $deferPack) {
                BuildContentPackJob::dispatch($resource->id);
                $pack = ['built' => false, 'queued' => true, 'reason' => null];
            } else {
                $pack['reason'] = 'deferred';
            }

            return [
                'id' => $resource->id,
                'version_before' => $before,
                'version_after' => $resource->version,
                'pack' => $pack,
            ];
        });
    }

    private function snapshotDirectory(): ?string
    {
        $date = (string) config('duas.hadeethenc.snapshot_date', '');
        $pin = (string) config('duas.hadeethenc.snapshot_sha256', '');

        if ($date === '' || $pin === '') {
            return null;
        }

        $directory = storage_path('app/duas/hadeethenc/'.$date);

        return is_dir($directory) ? $directory : null;
    }

    /**
     * @return array<string, list<array<string, mixed>>>
     */
    private function optionalConfigArray(string $file): array
    {
        $path = config_path($file.'.php');

        if (! is_file($path)) {
            return [];
        }

        $value = require $path;

        return is_array($value) ? $value : [];
    }

    /**
     * @param  list<ImportIssue>  $issues
     */
    private function hasErrors(array $issues): bool
    {
        foreach ($issues as $issue) {
            if ($issue->isError()) {
                return true;
            }
        }

        return false;
    }
}
