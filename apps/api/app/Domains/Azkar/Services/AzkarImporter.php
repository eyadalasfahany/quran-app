<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Services;

use App\Domains\Azkar\Data\ImportIssue;
use App\Domains\Azkar\Data\ImportPlan;
use App\Domains\Azkar\Data\ImportReport;
use App\Domains\Azkar\Data\ImportStats;
use App\Domains\Azkar\Exceptions\CatalogueUnreadableException;
use App\Domains\Azkar\OpenDua\CatalogueParser;
use App\Domains\Azkar\Repositories\Contracts\AzkarImportRepository;
use App\Domains\Azkar\Validation\CatalogueValidator;
use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\TextDirection;
use App\Domains\Content\Jobs\BuildContentPackJob;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Repositories\Contracts\ResourceRepository;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Runs one import: lock check, parse, validate, transform, report and, on a wet import that passed, one transaction
 * that replaces the azkar rows and bumps the resource version (ADR 0031 §1, §3, §9).
 */
final class AzkarImporter
{
    public function __construct(
        private readonly CatalogueParser $parser,
        private readonly CatalogueValidator $validator,
        private readonly AzkarTransformer $transformer,
        private readonly ResourceRepository $resources,
        private readonly AzkarImportRepository $azkar,
    ) {}

    public function run(string $path, bool $dryRun): ImportReport
    {
        $now = CarbonImmutable::now('UTC');

        if (! $dryRun) {
            $locks = $this->lockReasons();

            if ($locks !== []) {
                return $this->locked($now, $locks);
            }
        }

        $sourceVersion = (string) config('azkar.opendua.version');
        $pinnedSha = (string) config('azkar.opendua.catalogue_sha256');
        $sourceKey = (string) config('azkar.opendua.source_key');
        $sourceCode = (string) config('azkar.opendua.source_code');

        try {
            $parsed = $this->parser->parse($path);
        } catch (CatalogueUnreadableException $exception) {
            return $this->failedToParse($now, $path, $exception, $dryRun);
        }

        $issues = [];

        if ($parsed->sha256 !== $pinnedSha) {
            $issues[] = new ImportIssue(ImportIssue::ERROR, 'checksum_mismatch', 'file');
        }

        $issues = [...$issues, ...$this->validator->validate($parsed->data)];
        $blocked = $this->blockedEntries($issues);
        $plan = $this->transformer->plan($parsed->data, $sourceVersion, $now->getTimestampMs(), $blocked);

        $sourceId = $this->resources->sourceId($sourceCode);
        $existing = $sourceId === null ? null : $this->resources->findBySource($sourceId, ResourceGroup::Azkar, $sourceKey);
        $previous = $existing instanceof Resource ? $this->azkar->itemTextHashes($existing->id) : [];
        $changed = $this->changedTexts($plan, $previous);

        $hasErrors = $this->hasErrors($issues);
        $status = $hasErrors ? ImportReport::STATUS_INVALID : ImportReport::STATUS_VALID;
        $resource = [
            'group' => ResourceGroup::Azkar->value,
            'source_key' => $sourceKey,
            'version_before' => $existing instanceof Resource ? $existing->version : 0,
            'version_after' => null,
        ];

        if (! $dryRun && ! $hasErrors) {
            $resource = $this->write($parsed->sha256, $parsed->data, $plan, $sourceId, $sourceKey, $sourceCode);
            $status = ImportReport::STATUS_IMPORTED;
        }

        return $this->report(
            now: $now,
            dryRun: $dryRun,
            status: $status,
            lockReasons: [],
            source: [
                'path' => $path,
                'bytes' => $parsed->bytes,
                'sha256' => $parsed->sha256,
                'pinned_sha256' => $pinnedSha,
                'pinned_version' => $sourceVersion,
                'data_version' => $parsed->data['dataVersion'] ?? null,
            ],
            plan: $plan,
            changed: $changed,
            resource: $resource,
            issues: $issues,
        );
    }

    /**
     * ADR 0031 §1: a wet import needs the env flag, a seeded source with granted rights, and complete recording rights if audio is on.
     *
     * @return list<string>
     */
    public function lockReasons(): array
    {
        $reasons = [];

        if (! (bool) config('azkar.opendua.import_enabled')) {
            $reasons[] = 'AZKAR_OPENDUA_IMPORT_ENABLED is false (azkar.opendua.import_enabled). Production import stays locked (ADR 0031 §1).';
        }

        $code = (string) config('azkar.opendua.source_code');
        $status = $this->azkar->sourcePermissionStatus($code);

        if ($status === null) {
            $reasons[] = 'Content source ['.$code.'] is not seeded.';
        } elseif ($status !== PermissionStatus::Granted) {
            $reasons[] = 'Content source ['.$code.'] permission_status is ['.$status->value.']; it must be granted (ADR 0031 §1).';
        }

        $rights = config('azkar.recording_rights', []);
        $licence = is_array($rights) ? ($rights['licence'] ?? null) : null;

        if ((bool) config('azkar.opendua.audio_rights_verified') && (! is_string($licence) || $licence === '')) {
            $reasons[] = 'Recording rights are incomplete: azkar.recording_rights.licence is empty (ADR 0031 §8).';
        }

        return $reasons;
    }

    /**
     * One transaction: find or create the resource, bump its version, replace its rows. The pack is queued after commit.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function write(string $sha256, array $data, ImportPlan $plan, ?int $sourceId, string $sourceKey, string $sourceCode): array
    {
        if ($sourceId === null) {
            throw new \LogicException('The source ['.$sourceCode.'] must be seeded before a wet import.');
        }

        [$resourceId, $versionBefore, $versionAfter] = DB::transaction(function () use ($sha256, $data, $plan, $sourceId, $sourceKey): array {
            $name = $data['collections'][0]['title'] ?? null;
            $resource = $this->resources->findBySource($sourceId, ResourceGroup::Azkar, $sourceKey)
                ?? $this->resources->create([
                    'source_id' => $sourceId,
                    'group' => ResourceGroup::Azkar,
                    'source_key' => $sourceKey,
                    'name' => is_string($name) ? $name : $sourceKey,
                    'language_code' => 'ar',
                    'direction' => TextDirection::Rtl,
                    'version' => 0,
                    'changes_floor_version' => 0,
                    'is_active' => true,
                ]);

            $before = $resource->version;
            $resource->version = $before + 1;
            // Devices older than this version get ChangesGoneException and re-download the pack (ContentDeliveryService).
            $resource->changes_floor_version = $resource->version;
            $resource->checksum = $sha256;
            $resource->is_active = true;
            $this->resources->save($resource);

            $this->azkar->replaceForResource($resource->id, $plan);

            return [$resource->id, $before, $resource->version];
        });

        BuildContentPackJob::dispatch($resourceId);

        return [
            'group' => ResourceGroup::Azkar->value,
            'source_key' => $sourceKey,
            'id' => $resourceId,
            'version_before' => $versionBefore,
            'version_after' => $versionAfter,
        ];
    }

    /**
     * @param  list<string>  $reasons
     */
    private function locked(CarbonImmutable $now, array $reasons): ImportReport
    {
        return new ImportReport(
            generatedAt: $now->toIso8601ZuluString('millisecond'),
            dryRun: false,
            status: ImportReport::STATUS_LOCKED,
            lockReasons: $reasons,
            source: [],
            content: [],
            sourced: [],
            gated: [],
            changedUpstreamTexts: [],
            resource: [],
            issues: [],
        );
    }

    private function failedToParse(CarbonImmutable $now, string $path, CatalogueUnreadableException $exception, bool $dryRun): ImportReport
    {
        return $this->report(
            now: $now,
            dryRun: $dryRun,
            status: ImportReport::STATUS_INVALID,
            lockReasons: [],
            source: ['path' => $path],
            plan: new ImportPlan([], [], [], [], [], [], [], [], new ImportStats),
            changed: [],
            resource: [],
            issues: [new ImportIssue(ImportIssue::ERROR, $exception->issueCode, 'file')],
        );
    }

    /**
     * @param  list<ImportIssue>  $issues
     * @param  list<string>  $lockReasons
     * @param  list<string>  $changed
     * @param  array<string, mixed>  $source
     * @param  array<string, mixed>  $resource
     */
    private function report(
        CarbonImmutable $now,
        bool $dryRun,
        string $status,
        array $lockReasons,
        array $source,
        ImportPlan $plan,
        array $changed,
        array $resource,
        array $issues,
    ): ImportReport {
        $stats = $plan->stats;
        $englishAvailable = $stats->englishStored + $stats->englishSkipped;

        return new ImportReport(
            generatedAt: $now->toIso8601ZuluString('millisecond'),
            dryRun: $dryRun,
            status: $status,
            lockReasons: $lockReasons,
            source: $source,
            content: [
                'entries_imported' => $stats->entries,
                'entries_blocked' => $stats->entriesBlocked,
                'chapters_imported' => $stats->chapters,
                'items' => ['recitation' => $stats->itemsRecitation, 'instruction' => $stats->itemsInstruction, 'narration' => $stats->itemsNarration],
                'segments' => ['text' => $stats->segmentsText, 'quran' => $stats->segmentsQuran],
                'quran_passages' => ['mapped' => $stats->quranPassagesMapped, 'unmapped' => $stats->quranPassagesUnmapped],
            ],
            sourced: [
                'items_with_required_count' => $stats->itemsWithRequiredCount,
                'items_without_required_count' => $stats->itemsWithoutRequiredCount,
                'entries_with_explanations' => 0,
                'entries_with_virtues' => 0,
                'entries_with_contexts' => 0,
                'entries_with_references' => 0,
                'entries_with_grades' => 0,
                'entries_without_explanations' => $stats->entries,
            ],
            gated: [
                'english' => [
                    'available' => $englishAvailable,
                    'stored' => $stats->englishStored,
                    'skipped' => $stats->englishSkipped,
                    'store_english' => (bool) config('azkar.opendua.store_english'),
                ],
                'recordings' => [
                    'upstream' => $stats->recordingsUpstream,
                    'upstream_objects' => $stats->recordingObjects,
                    'imported' => $stats->recordingsImported,
                    'legally_downloadable' => $stats->recordingsDownloadable,
                    'audio_rights_verified' => (bool) config('azkar.opendua.audio_rights_verified'),
                ],
            ],
            changedUpstreamTexts: [
                'count' => count($changed),
                'item_keys' => $changed,
            ],
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
     * Entry indexes with at least one error. Their rows are not emitted, so the counts reflect what would be imported.
     *
     * @param  list<ImportIssue>  $issues
     * @return array<int, true>
     */
    private function blockedEntries(array $issues): array
    {
        $blocked = [];

        foreach ($issues as $issue) {
            if ($issue->isError() && $issue->entryIndex !== null) {
                $blocked[$issue->entryIndex] = true;
            }
        }

        return $blocked;
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

    /**
     * ADR 0031 "changed upstream texts": items whose stored source hash differs from this upstream file.
     *
     * @param  array<string, string>  $previous
     * @return list<string>
     */
    private function changedTexts(ImportPlan $plan, array $previous): array
    {
        $changed = [];

        foreach ($plan->items as $item) {
            $key = (string) $item['item_key'];
            $hash = $item['source_text_sha256'];

            if (is_string($hash) && isset($previous[$key]) && $previous[$key] !== $hash) {
                $changed[] = $key;
            }
        }

        return $changed;
    }
}
