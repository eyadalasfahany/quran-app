<?php

declare(strict_types=1);

namespace App\Domains\Names\Services;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\TextDirection;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Repositories\Contracts\ResourceRepository;
use App\Domains\Names\Data\ImportReport;
use App\Domains\Names\Data\NamesImportIssue;
use App\Domains\Names\Data\NamesImportPlan;
use App\Domains\Names\Exceptions\NamesSourceLockedException;
use App\Domains\Names\Repositories\Contracts\NamesImportRepository;
use Illuminate\Support\Facades\DB;

final class NamesImporter
{
    public function __construct(
        private readonly NamesSourceGate $gate,
        private readonly NamesReviewedFileParser $parser,
        private readonly NamesImportFingerprint $fingerprints,
        private readonly ResourceRepository $resources,
        private readonly NamesImportRepository $names,
    ) {}

    public function run(?string $path, bool $dryRun = false): ImportReport
    {
        try {
            $this->gate->assertGrantedForImport();
        } catch (NamesSourceLockedException $exception) {
            return new ImportReport(ImportReport::STATUS_REFUSED, ['message' => $exception->getMessage()]);
        }

        $resolvedPath = $this->resolvePath($path);

        if ($resolvedPath === null) {
            return new ImportReport(ImportReport::STATUS_NOOP, [
                'message' => 'No data file path. Pass a path or set names.list_slug in config.',
                'dry_run' => $dryRun,
            ]);
        }

        $expectedSlug = config('names.list_slug');
        $expectedSlug = is_string($expectedSlug) && $expectedSlug !== '' ? $expectedSlug : null;

        $parsed = $this->parser->parse($resolvedPath, $expectedSlug);
        $issues = $parsed['issues'];
        $plan = $parsed['plan'];

        if ($this->hasErrors($issues)) {
            return new ImportReport(ImportReport::STATUS_INVALID, [
                'path' => $resolvedPath,
                'dry_run' => $dryRun,
                'issues' => $this->issuePayload($issues),
            ]);
        }

        if (! $plan instanceof NamesImportPlan) {
            return new ImportReport(ImportReport::STATUS_INVALID, [
                'path' => $resolvedPath,
                'dry_run' => $dryRun,
                'message' => 'Validation failed without a plan.',
            ]);
        }

        $sourceCode = config('names.source_code');

        if (! is_string($sourceCode) || $sourceCode === '') {
            return new ImportReport(ImportReport::STATUS_INVALID, [
                'message' => 'Names source code is not configured.',
            ]);
        }

        $sourceId = $this->resources->sourceId($sourceCode);

        if ($sourceId === null) {
            return new ImportReport(ImportReport::STATUS_INVALID, [
                'message' => 'Content source ['.$sourceCode.'] is missing.',
            ]);
        }

        $fingerprint = $this->fingerprints->of(
            $plan->sourceSha256,
            $plan->list,
            $plan->names,
            [],
            [],
        );

        $sourceKey = $plan->list['list_slug'];
        $existing = $this->resources->findBySource($sourceId, ResourceGroup::Names, $sourceKey);

        if ($dryRun) {
            return new ImportReport(ImportReport::STATUS_IMPORTED, [
                'path' => $resolvedPath,
                'dry_run' => true,
                'names' => count($plan->names),
                'source_sha256' => $plan->sourceSha256,
                'fingerprint' => $fingerprint,
                'would_bump' => ! ($existing instanceof Resource && $existing->import_fingerprint !== null && hash_equals($existing->import_fingerprint, $fingerprint)),
            ]);
        }

        if ($existing instanceof Resource && $existing->import_fingerprint !== null && hash_equals($existing->import_fingerprint, $fingerprint)) {
            return new ImportReport(ImportReport::STATUS_UNCHANGED, [
                'path' => $resolvedPath,
                'resource_id' => $existing->id,
                'version' => $existing->version,
                'names' => count($plan->names),
                'source_sha256' => $plan->sourceSha256,
            ]);
        }

        $written = $this->write($plan, $sourceId, $sourceKey, $fingerprint, $existing);

        return new ImportReport(ImportReport::STATUS_IMPORTED, [
            'path' => $resolvedPath,
            'resource_id' => $written['id'],
            'version_before' => $written['version_before'],
            'version_after' => $written['version_after'],
            'names' => count($plan->names),
            'source_sha256' => $plan->sourceSha256,
        ]);
    }

    private function resolvePath(?string $path): ?string
    {
        if (is_string($path) && $path !== '') {
            return $path;
        }

        $slug = config('names.list_slug');

        if (! is_string($slug) || $slug === '') {
            return null;
        }

        $default = database_path('data/names/'.$slug.'.json');

        return is_file($default) ? $default : $default;
    }

    /**
     * @return array{id: int, version_before: int, version_after: int}
     */
    private function write(NamesImportPlan $plan, int $sourceId, string $sourceKey, string $fingerprint, ?Resource $existing): array
    {
        return DB::transaction(function () use ($plan, $sourceId, $sourceKey, $fingerprint, $existing): array {
            $resource = $existing ?? $this->resources->create([
                'source_id' => $sourceId,
                'group' => ResourceGroup::Names,
                'source_key' => $sourceKey,
                'name' => $sourceKey,
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

            $this->names->replaceForResource($resource->id, $plan);

            return [
                'id' => $resource->id,
                'version_before' => $before,
                'version_after' => $resource->version,
            ];
        });
    }

    /**
     * @param  list<NamesImportIssue>  $issues
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
     * @param  list<NamesImportIssue>  $issues
     * @return list<array{severity: string, code: string, path: string}>
     */
    private function issuePayload(array $issues): array
    {
        return array_map(
            static fn (NamesImportIssue $issue): array => [
                'severity' => $issue->severity,
                'code' => $issue->code,
                'path' => $issue->path,
            ],
            $issues,
        );
    }
}
