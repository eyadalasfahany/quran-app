<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Services;

use App\Domains\Azkar\Data\ImportIssue;
use App\Domains\Azkar\Data\ImportPlan;
use App\Domains\Azkar\Data\ImportReport;
use App\Domains\Azkar\Data\ImportStats;
use App\Domains\Azkar\Exceptions\CatalogueUnreadableException;
use App\Domains\Azkar\Exceptions\SnapshotException;
use App\Domains\Azkar\Repositories\Contracts\AzkarImportRepository;
use App\Domains\Azkar\Sources\AzkarSourceRegistry;
use App\Domains\Azkar\Sources\HadeethEncSnapshot;
use App\Domains\Azkar\Sources\SourceProfile;
use App\Domains\Azkar\Validation\CatalogueValidator;
use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\TextDirection;
use App\Domains\Content\Jobs\BuildContentPackJob;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuilder;
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
        private readonly AzkarSourceRegistry $sources,
        private readonly CatalogueValidator $validator,
        private readonly AzkarTransformer $transformer,
        private readonly ResourceRepository $resources,
        private readonly AzkarImportRepository $azkar,
        private readonly PackBuilder $packs,
        private readonly HadeethEncSnapshot $hadeethSnapshot,
        private readonly HadeethEncNotes $hadeethNotes,
    ) {}

    /**
     * @param  bool  $buildPacks  Build the azkar pack now, in this process, instead of queueing it (release runs).
     * @param  bool  $skipBlocked  Local only: leave out entries with errors and import the rest (ADR 0031 §11).
     *
     * @throws \LogicException When $skipBlocked is requested in production.
     */
    public function run(string $path, bool $dryRun, bool $buildPacks = false, bool $skipBlocked = false, ?string $sourceCode = null): ImportReport
    {
        if ($skipBlocked && app()->isProduction()) {
            throw new \LogicException('Skipping blocked entries is refused in production (ADR 0031 §11).');
        }

        $now = CarbonImmutable::now('UTC');
        $profile = $this->sources->for($sourceCode ?? $this->sources->primaryCode())->profile();
        $source = $this->sources->for($profile->code);

        if (! $dryRun) {
            $locks = $this->lockReasons($profile);

            if ($locks !== []) {
                return $this->locked($now, $locks);
            }
        }

        $sourceVersion = $profile->version;
        $pinnedSha = $profile->pinnedSha256;
        $sourceKey = $profile->sourceKey;
        $sourceCode = $profile->code;

        try {
            $parsed = $source->parse($path);
        } catch (CatalogueUnreadableException $exception) {
            return $this->failedToParse($now, $path, $exception, $dryRun, $profile);
        }

        $issues = [];

        if ($parsed->sha256 !== $pinnedSha) {
            $issues[] = new ImportIssue(ImportIssue::ERROR, 'checksum_mismatch', 'file');
        }

        $issues = [...$issues, ...$this->validator->validate($parsed->data, $profile)];
        $enrichment = $this->enrichment($profile, $parsed->data);
        $issues = [...$issues, ...$enrichment['issues']];
        $blocked = $this->blockedEntries($issues);
        $plan = $this->transformer->plan($parsed->data, $sourceVersion, $now->getTimestampMs(), $blocked, $profile, $enrichment['notes']);

        $sourceId = $this->resources->sourceId($sourceCode);
        $existing = $sourceId === null ? null : $this->resources->findBySource($sourceId, ResourceGroup::Azkar, $sourceKey);
        $previous = $existing instanceof Resource ? $this->azkar->itemTextHashes($existing->id) : [];
        $changed = $this->changedTexts($plan, $previous);

        $skipped = $skipBlocked ? $this->skippedEntries($issues) : [];
        $hasErrors = $this->hasErrors($issues, $skipBlocked);
        $status = $hasErrors ? ImportReport::STATUS_INVALID : ImportReport::STATUS_VALID;
        $resource = [
            'group' => ResourceGroup::Azkar->value,
            'source_key' => $sourceKey,
            'version_before' => $existing instanceof Resource ? $existing->version : 0,
            'version_after' => null,
        ];

        if (! $dryRun && ! $hasErrors) {
            $resource = $this->write($parsed->sha256, $parsed->data, $plan, $sourceId, $sourceKey, $sourceCode, $buildPacks);
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
                'source' => $profile->code,
            ],
            plan: $plan,
            changed: $changed,
            resource: $resource,
            issues: $issues,
            profile: $profile,
            skipped: $skipped,
            enrichment: $enrichment['report'],
        );
    }

    /**
     * ADR 0031 §1: a wet import needs the env flag, a seeded source with granted rights, and complete recording rights if audio is on.
     *
     * @return list<string>
     */
    public function lockReasons(SourceProfile $profile): array
    {
        $reasons = [];

        if (! $profile->importEnabled) {
            $reasons[] = $profile->importFlagKey.' is false (azkar.'.$profile->code.'.import_enabled). Production import stays locked (ADR 0031 §1).';
        }

        $code = $profile->code;
        $status = $this->azkar->sourcePermissionStatus($code);

        if ($status === null) {
            $reasons[] = 'Content source ['.$code.'] is not seeded.';
        } elseif ($status !== PermissionStatus::Granted) {
            $reasons[] = 'Content source ['.$code.'] permission_status is ['.$status->value.']; it must be granted (ADR 0031 §1).';
        }

        $rights = config('azkar.recording_rights', []);
        $licence = is_array($rights) ? ($rights['licence'] ?? null) : null;

        if ($profile->audioRightsVerified && (! is_string($licence) || $licence === '')) {
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
    private function write(string $sha256, array $data, ImportPlan $plan, ?int $sourceId, string $sourceKey, string $sourceCode, bool $buildPacks): array
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

        if (! $buildPacks) {
            BuildContentPackJob::dispatch($resourceId);
        }

        return [
            'group' => ResourceGroup::Azkar->value,
            'source_key' => $sourceKey,
            'id' => $resourceId,
            'version_before' => $versionBefore,
            'version_after' => $versionAfter,
            'pack' => $buildPacks ? $this->buildPackNow($resourceId) : ['built' => false, 'queued' => true],
        ];
    }

    /**
     * Builds the azkar pack synchronously for the rows just written (release runs, ADR 0031 §11).
     *
     * @return array<string, mixed>
     */
    private function buildPackNow(int $resourceId): array
    {
        $resource = $this->resources->find($resourceId);

        if ($resource === null) {
            throw new \LogicException('The azkar resource ['.$resourceId.'] disappeared after the import.');
        }

        $pack = $this->packs->build($resource);

        return ['built' => true, 'version' => $pack->version, 'sha256' => $pack->sha256, 'size_bytes' => $pack->sizeBytes, 'row_count' => $pack->rowCount];
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

    private function failedToParse(CarbonImmutable $now, string $path, CatalogueUnreadableException $exception, bool $dryRun, SourceProfile $profile): ImportReport
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
            profile: $profile,
        );
    }

    /**
     * @param  list<ImportIssue>  $issues
     * @param  list<string>  $lockReasons
     * @param  list<string>  $changed
     * @param  array<string, mixed>  $source
     * @param  array<string, mixed>  $resource
     * @param  list<array{entry: string, codes: list<string>}>  $skipped
     * @param  array<string, mixed>  $enrichment
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
        SourceProfile $profile,
        array $skipped = [],
        array $enrichment = [],
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
                'entries_skipped' => count($skipped),
                'skipped' => $skipped,
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
                'hadeethenc' => $enrichment,
                'english' => [
                    'available' => $englishAvailable,
                    'stored' => $stats->englishStored,
                    'skipped' => $stats->englishSkipped,
                    'store_english' => $profile->storeEnglish,
                ],
                'recordings' => [
                    'upstream' => $stats->recordingsUpstream,
                    'upstream_objects' => $stats->recordingObjects,
                    'imported' => $stats->recordingsImported,
                    'legally_downloadable' => $stats->recordingsDownloadable,
                    'audio_rights_verified' => $profile->audioRightsVerified,
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
     * ADR 0031 §12: HadeethEnc notes for the primary source only. It runs when the hadeethenc source is granted and its
     * flag is on, reads only the verified snapshot, and gives a reason for every case it does not run.
     *
     * @param  array<string, mixed>  $catalogue
     * @return array{notes: array<string, list<array<string, mixed>>>, issues: list<ImportIssue>, report: array<string, mixed>}
     */
    private function enrichment(SourceProfile $profile, array $catalogue): array
    {
        $report = ['enabled' => false, 'reason' => null, 'entries_enriched' => 0, 'links_reviewed' => 0, 'links_candidate' => 0, 'notes' => ['explanation' => 0, 'grade' => 0, 'reference' => 0]];
        $skip = static fn (string $reason): array => ['notes' => [], 'issues' => [], 'report' => [...$report, 'reason' => $reason]];

        if ($profile->code !== $this->sources->primaryCode()) {
            return $skip('Not the primary source; HadeethEnc notes attach to primary entries only.');
        }

        if (! (bool) config('azkar.hadeethenc.enabled')) {
            return $skip('AZKAR_HADEETHENC_ENABLED is false (azkar.hadeethenc.enabled).');
        }

        if ($this->azkar->sourcePermissionStatus('hadeethenc') !== PermissionStatus::Granted) {
            return $skip('Content source [hadeethenc] is not granted (ADR 0031 §12).');
        }

        try {
            $records = $this->hadeethSnapshot->load(storage_path('app/azkar/hadeethenc/'.(string) config('azkar.hadeethenc.snapshot_date')));
        } catch (SnapshotException $exception) {
            return ['notes' => [], 'issues' => [new ImportIssue(ImportIssue::ERROR, 'hadeethenc_snapshot_invalid', 'hadeethenc')], 'report' => [...$report, 'reason' => $exception->getMessage()]];
        }

        $links = config('azkar_hadeethenc_links', []);
        $built = $this->hadeethNotes->build(is_array($links) ? $links : [], $records, app()->isProduction());
        $issues = [];

        foreach ($built['candidates'] as $link) {
            $issues[] = new ImportIssue(ImportIssue::WARNING, 'hadeethenc_link_candidate', 'link:'.$link);
        }

        foreach ($built['missing'] as $link) {
            $issues[] = new ImportIssue(ImportIssue::ERROR, 'hadeethenc_hadith_missing', 'link:'.$link);
        }

        return [
            'notes' => $built['notes'],
            'issues' => $issues,
            'report' => [
                'enabled' => true,
                'reason' => null,
                'entries_enriched' => $built['stats']['entries_enriched'],
                'links_reviewed' => $built['stats']['links_reviewed'],
                'links_candidate' => $built['stats']['links_candidate'],
                'notes' => ['explanation' => $built['stats']['explanation'], 'grade' => $built['stats']['grade'], 'reference' => $built['stats']['reference']],
            ],
        ];
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
     * With $skipBlocked, an error that belongs to an entry leaves that entry out and does not fail the run. Errors
     * with no entry (file, pin, structure, counts) always fail it.
     *
     * @param  list<ImportIssue>  $issues
     */
    private function hasErrors(array $issues, bool $skipBlocked): bool
    {
        foreach ($issues as $issue) {
            if ($issue->isError() && (! $skipBlocked || $issue->entryKey === null)) {
                return true;
            }
        }

        return false;
    }

    /**
     * The entries left out by --skip-blocked, with their error codes. Keys and codes only.
     *
     * @param  list<ImportIssue>  $issues
     * @return list<array{entry: string, codes: list<string>}>
     */
    private function skippedEntries(array $issues): array
    {
        $codes = [];

        foreach ($issues as $issue) {
            if ($issue->isError() && $issue->entryKey !== null) {
                $codes[$issue->entryKey][$issue->code] = true;
            }
        }

        $skipped = [];

        foreach ($codes as $entry => $set) {
            $skipped[] = ['entry' => (string) $entry, 'codes' => array_keys($set)];
        }

        return $skipped;
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
