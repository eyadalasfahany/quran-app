<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\TextDirection;
use App\Domains\Content\Jobs\BuildContentPackJob;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Packs\PackBuildException;
use App\Domains\Content\Repositories\Contracts\ResourceRepository;
use App\Domains\Hadith\Contracts\HadithCollectionSource;
use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Exceptions\HadithImportLockedException;
use App\Domains\Hadith\Exceptions\HadithPinException;
use App\Domains\Hadith\Exceptions\HadithRangeCorrectionException;
use App\Domains\Hadith\Exceptions\HadithReferenceMismatchException;
use App\Domains\Hadith\Exceptions\HadithSourceFormatException;
use App\Domains\Hadith\Exceptions\HadithTextIntegrityException;
use App\Domains\Hadith\Import\Records\CollectionImportResult;
use App\Domains\Hadith\Import\Records\CollectionStats;
use App\Domains\Hadith\Import\Records\HadithImportReport;
use App\Domains\Hadith\Import\Records\HadithIssue;
use App\Domains\Hadith\Import\Records\IntegrityResult;
use App\Domains\Hadith\Import\Records\MappingResult;
use App\Domains\Hadith\Overlay\HadithOverlayBuilder;
use App\Domains\Hadith\Repositories\Contracts\HadithImportRepository;
use App\Domains\Hadith\Sources\FawazHadithSource;
use App\Domains\Hadith\Sources\HadithSnapshotPresence;
use App\Domains\Hadith\Sources\HadithSourceRegistry;
use App\Domains\Hadith\Validation\HadithCollectionValidator;
use App\Integrations\HadithApiFawaz\HadithApiFawazException;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Runs the Hadith import, one collection at a time: fingerprint, presence, read, map, validate, then one transaction per
 * collection that replaces its rows, runs the text-integrity check and bumps the resource version (ADR 0042, step 6).
 * A failure in one collection writes nothing for it and the run goes on with the next.
 */
final class HadithImporter
{
    public const string LOCK_KEY = 'hadith:import';

    private const int LOCK_SECONDS = 3600;

    private const string EDITION_PIN_PREFIX = 'editions/ara-';

    private const string EDITION_PIN_SUFFIX = '.json';

    public function __construct(
        private readonly HadithSourceRegistry $sources,
        private readonly HadithSnapshotPresence $presence,
        private readonly HadithMapper $mapper,
        private readonly HadithCollectionValidator $validator,
        private readonly HadithImportFingerprint $fingerprints,
        private readonly HadithTextIntegrityChecker $integrity,
        private readonly HadithImportRepository $repository,
        private readonly ResourceRepository $resources,
        private readonly PackBuilder $packs,
        private readonly FawazHadithSource $source,
        private readonly HadithRangeCorrections $corrections,
        private readonly HadithCompletenessExceptions $completeness,
        private readonly HadithPlacements $placements,
        private readonly HadithOverlayBuilder $overlays,
        private readonly HadithExtraBooks $extraBooks,
    ) {}

    /**
     * @param  list<string>  $slugs  Canonical slugs, in the order to import.
     *
     * @throws \LogicException When both pack options are set, or the source row is not seeded.
     * @throws \InvalidArgumentException For a slug not in config('hadith.collections').
     * @throws HadithImportLockedException When a wet run cannot get the lock.
     * @throws HadithRangeCorrectionException When a configured range correction is malformed or names an unknown collection.
     * @throws HadithDataFileException When a configured completeness exception is malformed or names an unknown collection.
     */
    public function run(array $slugs, bool $dryRun = false, bool $buildPacks = false, bool $deferPack = false): HadithImportReport
    {
        if ($buildPacks && $deferPack) {
            throw new \LogicException('Choose --build-packs or --defer-pack, not both.');
        }

        $this->assertSlugs($slugs);
        $this->corrections->assertKnown();
        $this->completeness->assertKnown();
        $this->placements->assertKnown();
        $this->extraBooks->assertKnown();
        $primary = $this->sources->primary();
        $content = $this->content($primary->code());

        if ($dryRun) {
            return $this->runCollections($slugs, $primary, $content, true, $buildPacks, $deferPack);
        }

        $lock = Cache::lock(self::LOCK_KEY, self::LOCK_SECONDS);

        if (! $lock->get()) {
            throw new HadithImportLockedException('Another Hadith import is already running.');
        }

        try {
            return $this->runCollections($slugs, $primary, $content, false, $buildPacks, $deferPack);
        } finally {
            $lock->release();
        }
    }

    /**
     * Read-only text-integrity check of the stored rows against the source. No lock, no writes.
     *
     * @param  list<string>  $slugs
     *
     * @throws \LogicException When the source row is not seeded.
     * @throws HadithRangeCorrectionException When a configured range correction is malformed or names an unknown collection.
     * @throws HadithDataFileException When a configured completeness exception is malformed or names an unknown collection.
     */
    public function verify(array $slugs): HadithImportReport
    {
        $this->assertSlugs($slugs);
        $this->corrections->assertKnown();
        $this->completeness->assertKnown();
        $this->placements->assertKnown();
        $this->extraBooks->assertKnown();
        $primary = $this->sources->primary();
        $content = $this->content($primary->code());
        $results = [];

        foreach ($slugs as $slug) {
            $results[] = $this->verifyCollection($slug, $primary, $content);
        }

        return new HadithImportReport(
            generatedAt: CarbonImmutable::now('UTC')->toIso8601ZuluString('millisecond'),
            dryRun: false,
            verify: true,
            peakMemoryBytes: memory_get_peak_usage(true),
            collections: $results,
        );
    }

    /**
     * @param  list<string>  $slugs
     */
    private function runCollections(array $slugs, HadithCollectionSource $primary, ContentSource $content, bool $dryRun, bool $buildPacks, bool $deferPack): HadithImportReport
    {
        $results = [];

        foreach ($slugs as $slug) {
            $results[] = $this->importCollection($slug, $primary, $content, $dryRun, $buildPacks, $deferPack);
            gc_collect_cycles();
        }

        return new HadithImportReport(
            generatedAt: CarbonImmutable::now('UTC')->toIso8601ZuluString('millisecond'),
            dryRun: $dryRun,
            verify: false,
            peakMemoryBytes: memory_get_peak_usage(true),
            collections: $results,
        );
    }

    private function importCollection(string $slug, HadithCollectionSource $primary, ContentSource $content, bool $dryRun, bool $buildPacks, bool $deferPack): CollectionImportResult
    {
        $fingerprint = $this->fingerprints->of($slug, (string) $content->attribution_ar, (string) $content->attribution_en);
        $resource = $this->resources->findBySource($content->id, ResourceGroup::HadithCollections, $slug);
        $unchangedFingerprint = $resource !== null
            && $resource->import_fingerprint !== null
            && hash_equals($resource->import_fingerprint, $fingerprint);

        if (! $dryRun && $resource !== null && $unchangedFingerprint) {
            $counts = $this->repository->storedCounts($resource->id);

            if ($counts !== null && $counts['total'] > 0 && $counts['entries'] === $counts['total']) {
                return $this->result($slug, CollectionImportResult::STATUS_UNCHANGED, null, null, [], true, $fingerprint, $resource->id, $resource->version, $resource->version, ['built' => false, 'queued' => false, 'reason' => 'unchanged'], null, $counts['complete'], $counts['incomplete']);
            }
        }

        $missing = $this->presence->missing($slug);

        if ($missing !== []) {
            return $this->result($slug, CollectionImportResult::STATUS_NO_SNAPSHOT, 'Pinned files not in the cache: '.implode(', ', $missing).'. Run hadith:import --download.', null, [], $unchangedFingerprint, $fingerprint, $resource?->id, $resource?->version, $resource?->version, [], null);
        }

        try {
            $info = $primary->info($slug);
            $collection = $primary->collection($slug);
        } catch (HadithPinException|HadithSourceFormatException|HadithApiFawazException $exception) {
            return $this->result($slug, CollectionImportResult::STATUS_FAILED, $exception->getMessage(), null, [], $unchangedFingerprint, $fingerprint, $resource?->id, $resource?->version, $resource?->version, [], null);
        }

        try {
            $overlay = $this->overlays->build($slug, $collection, $this->originSourceIds());
            $mapping = $this->mapper->map($collection, $info, $content->id, $primary->code(), $primary->version(), (string) $content->attribution_ar, (string) $content->attribution_en, CarbonImmutable::now('UTC'), $overlay);
        } catch (HadithRangeCorrectionException|HadithDataFileException $exception) {
            return $this->result($slug, CollectionImportResult::STATUS_FAILED, $exception->getMessage(), null, [], $unchangedFingerprint, $fingerprint, $resource?->id, $resource?->version, $resource?->version, [], null);
        }

        unset($collection);

        $issues = $this->validator->validate($slug, $mapping);
        $failure = null;

        try {
            $this->validator->assertReferencesAgree($slug, $mapping->stats);
        } catch (HadithReferenceMismatchException $exception) {
            $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'reference_book_mismatch', null);
            $failure = $exception->getMessage();
        }

        $hasErrors = false;

        foreach ($issues as $issue) {
            if ($issue->severity === HadithIssue::SEVERITY_ERROR) {
                $hasErrors = true;
                break;
            }
        }

        if ($hasErrors) {
            return $this->result($slug, CollectionImportResult::STATUS_INVALID, $failure, $mapping->stats, $issues, $unchangedFingerprint, $fingerprint, $resource?->id, $resource?->version, $resource?->version, [], null);
        }

        if ($dryRun) {
            return $this->result($slug, CollectionImportResult::STATUS_VALID, null, $mapping->stats, $issues, $unchangedFingerprint, $fingerprint, $resource?->id, $resource?->version, $resource?->version, [], null);
        }

        return $this->write($slug, $content, $primary, $mapping, $issues, $fingerprint, $buildPacks, $deferPack);
    }

    /**
     * @param  list<HadithIssue>  $issues
     */
    private function write(string $slug, ContentSource $content, HadithCollectionSource $primary, MappingResult $mapping, array $issues, string $fingerprint, bool $buildPacks, bool $deferPack): CollectionImportResult
    {
        $position = (int) array_search($slug, (array) config('hadith.collections'), true) + 1;
        $title = $mapping->plan->collection['title_ar'] ?? null;
        $sourceSlug = $this->source->sourceSlug($slug);
        $checksum = $this->editionPin($sourceSlug);
        $complete = $mapping->stats->complete;

        try {
            [$resourceId, $versionBefore, $versionAfter, $check] = DB::transaction(function () use ($slug, $content, $mapping, $fingerprint, $title, $position, $checksum, $complete): array {
                $resource = $this->resources->findBySource($content->id, ResourceGroup::HadithCollections, $slug)
                    ?? $this->resources->create([
                        'source_id' => $content->id,
                        'group' => ResourceGroup::HadithCollections,
                        'source_key' => $slug,
                        'name' => is_string($title) ? $title : 'مجموعة '.$this->arabicDigits($position),
                        'name_ar' => is_string($title) ? $title : null,
                        'language_code' => 'ar',
                        'direction' => TextDirection::Rtl,
                        'version' => 0,
                        'changes_floor_version' => 0,
                        'is_active' => $complete,
                    ]);

                $before = $resource->version;
                $resource->version = $before + 1;
                $resource->changes_floor_version = $resource->version;
                $resource->checksum = $checksum;
                $resource->import_fingerprint = $fingerprint;
                $resource->name = is_string($title) ? $title : 'مجموعة '.$this->arabicDigits($position);
                $resource->name_ar = is_string($title) ? $title : null;
                $resource->is_active = $complete;
                $this->resources->save($resource);

                $this->repository->replaceForResource($resource->id, $mapping->plan);
                $check = $this->integrity->checkAgainstPlan($resource->id, $mapping->plan);

                if (! $check->ok()) {
                    throw new HadithTextIntegrityException($slug, $check->storedHashMismatches, $check->sourceMismatches, $check->missing, $check->extra);
                }

                return [$resource->id, $before, $resource->version, $check];
            });
        } catch (HadithTextIntegrityException $exception) {
            return $this->result($slug, CollectionImportResult::STATUS_FAILED, $exception->getMessage(), $mapping->stats, $issues, false, $fingerprint, null, null, null, [], null);
        } catch (Throwable $exception) {
            return $this->result($slug, CollectionImportResult::STATUS_FAILED, $exception::class, $mapping->stats, $issues, false, $fingerprint, null, null, null, [], null);
        }

        $incompleteCount = count($mapping->stats->incompleteNumbers);

        if (! $complete) {
            // ADR 0076 «Rule, 7 Nov 2026»: the rows are written and the resource is inactive; no pack is built or queued.
            return $this->result($slug, CollectionImportResult::STATUS_HELD_BACK, null, $mapping->stats, $issues, false, $fingerprint, $resourceId, $versionBefore, $versionAfter, ['built' => false, 'queued' => false, 'reason' => 'incomplete'], $check, false, $incompleteCount);
        }

        $pack = $this->packAfterCommit($resourceId, $buildPacks, $deferPack);

        return $this->result($slug, CollectionImportResult::STATUS_IMPORTED, null, $mapping->stats, $issues, false, $fingerprint, $resourceId, $versionBefore, $versionAfter, $pack, $check, true, $incompleteCount);
    }

    /**
     * @return array<string, bool|int|string|null>
     */
    private function packAfterCommit(int $resourceId, bool $buildPacks, bool $deferPack): array
    {
        if ($buildPacks) {
            $resource = $this->resources->find($resourceId);

            if (! $resource instanceof Resource) {
                return ['built' => false, 'queued' => false, 'error' => 'resource_missing'];
            }

            try {
                $pack = $this->packs->build($resource);
            } catch (PackBuildException $exception) {
                return ['built' => false, 'queued' => false, 'error' => $exception::class];
            }

            return ['built' => true, 'queued' => false, 'version' => $pack->version, 'sha256' => $pack->sha256, 'size_bytes' => $pack->sizeBytes, 'row_count' => $pack->rowCount];
        }

        if ($deferPack) {
            return ['built' => false, 'queued' => false, 'deferred' => true];
        }

        BuildContentPackJob::dispatch($resourceId);

        return ['built' => false, 'queued' => true];
    }

    private function verifyCollection(string $slug, HadithCollectionSource $primary, ContentSource $content): CollectionImportResult
    {
        $resource = $this->resources->findBySource($content->id, ResourceGroup::HadithCollections, $slug);

        if ($resource === null) {
            return $this->result($slug, CollectionImportResult::STATUS_FAILED, 'Not imported yet.', null, [], false, null, null, null, null, [], null);
        }

        $missing = $this->presence->missing($slug);

        if ($missing !== []) {
            return $this->result($slug, CollectionImportResult::STATUS_NO_SNAPSHOT, 'Pinned files not in the cache: '.implode(', ', $missing).'. Run hadith:import --download.', null, [], false, null, $resource->id, $resource->version, $resource->version, [], null);
        }

        try {
            $collection = $primary->collection($slug);
        } catch (HadithPinException|HadithSourceFormatException|HadithApiFawazException $exception) {
            return $this->result($slug, CollectionImportResult::STATUS_FAILED, $exception->getMessage(), null, [], false, null, $resource->id, $resource->version, $resource->version, [], null);
        }

        try {
            $overlay = $this->overlays->build($slug, $collection, $this->originSourceIds());
            $mapping = $this->mapper->map($collection, null, $content->id, $primary->code(), $primary->version(), (string) $content->attribution_ar, (string) $content->attribution_en, CarbonImmutable::now('UTC'), $overlay);
        } catch (HadithRangeCorrectionException|HadithDataFileException $exception) {
            return $this->result($slug, CollectionImportResult::STATUS_FAILED, $exception->getMessage(), null, [], false, null, $resource->id, $resource->version, $resource->version, [], null);
        }

        unset($collection);

        $check = $this->integrity->checkAgainstPlan($resource->id, $mapping->plan);
        $status = $check->ok() ? CollectionImportResult::STATUS_VERIFIED : CollectionImportResult::STATUS_INTEGRITY_FAILED;

        return $this->result($slug, $status, null, $mapping->stats, [], false, null, $resource->id, $resource->version, $resource->version, [], $check);
    }

    /**
     * @throws \LogicException
     */
    private function content(string $code): ContentSource
    {
        $content = $this->repository->source($code);

        if ($content === null) {
            throw new \LogicException('The source ['.$code.'] must be seeded before an import.');
        }

        return $content;
    }

    /**
     * @param  list<string>  $slugs
     *
     * @throws \InvalidArgumentException
     */
    private function assertSlugs(array $slugs): void
    {
        $known = (array) config('hadith.collections');

        foreach ($slugs as $slug) {
            if (! in_array($slug, $known, true)) {
                throw new \InvalidArgumentException('Unknown Hadith collection ['.$slug.'].');
            }
        }
    }

    /**
     * The content_sources ids of the gap origins that are seeded. The overlay builder refuses a file that names an origin
     * whose row is missing (step 6b.3).
     *
     * @return array<string, int>
     */
    private function originSourceIds(): array
    {
        $ids = [];

        foreach (['openiti', 'hadithapicom'] as $code) {
            $source = $this->repository->source($code);

            if ($source !== null) {
                $ids[$code] = (int) $source->getKey();
            }
        }

        return $ids;
    }

    private function editionPin(string $sourceSlug): string
    {
        $pins = config('hadith.files', []);
        $pin = is_array($pins) ? ($pins[self::EDITION_PIN_PREFIX.$sourceSlug.self::EDITION_PIN_SUFFIX] ?? null) : null;

        return is_string($pin) ? $pin : '';
    }

    private function arabicDigits(int $number): string
    {
        return strtr((string) $number, [
            '0' => "\u{0660}", '1' => "\u{0661}", '2' => "\u{0662}", '3' => "\u{0663}", '4' => "\u{0664}",
            '5' => "\u{0665}", '6' => "\u{0666}", '7' => "\u{0667}", '8' => "\u{0668}", '9' => "\u{0669}",
        ]);
    }

    /**
     * @param  list<HadithIssue>  $issues
     * @param  array<string, bool|int|string|null>  $pack
     */
    private function result(string $slug, string $status, ?string $failure, ?CollectionStats $stats, array $issues, bool $unchanged, ?string $fingerprint, ?int $resourceId, ?int $versionBefore, ?int $versionAfter, array $pack, ?IntegrityResult $integrity, ?bool $complete = null, ?int $incompleteCount = null): CollectionImportResult
    {
        return new CollectionImportResult(
            slug: $slug,
            status: $status,
            failure: $failure,
            stats: $stats,
            issues: $issues,
            fingerprintUnchanged: $unchanged,
            fingerprint: $fingerprint,
            resourceId: $resourceId,
            versionBefore: $versionBefore,
            versionAfter: $versionAfter,
            pack: $pack,
            integrity: $integrity,
            complete: $complete,
            incompleteCount: $incompleteCount,
        );
    }
}
