<?php

declare(strict_types=1);

namespace App\Domains\Content\Services;

use App\Domains\Content\Data\SyncRunResult;
use App\Domains\Content\Enums\LanguageCode;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\SyncEnvironment;
use App\Domains\Content\Enums\SyncRunStatus;
use App\Domains\Content\Enums\TextDirection;
use App\Domains\Content\Events\ResourceContentChanged;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Models\SyncRun;
use App\Domains\Content\Models\SyncState;
use App\Domains\Content\Repositories\Contracts\ContentChangeRepository;
use App\Domains\Content\Repositories\Contracts\ResourceRepository;
use App\Domains\Content\Repositories\Contracts\SyncRunRepository;
use App\Domains\Content\Repositories\Contracts\SyncStateRepository;
use App\Domains\Content\Sync\GroupHandler;
use App\Domains\Content\Sync\GroupHandlers;
use App\Domains\Content\Sync\SyncException;
use App\Integrations\QuranFoundation\CatalogEntry;
use App\Integrations\QuranFoundation\ContentSyncClient;
use App\Integrations\QuranFoundation\Mutation;
use App\Integrations\QuranFoundation\MutationType;
use App\Integrations\QuranFoundation\QfConfig;
use App\Integrations\QuranFoundation\Snapshot;
use App\Integrations\QuranFoundation\SyncPage;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

final class ContentSyncService
{
    /**
     * Missing catalog ids already warned in this run, keyed by group and source id.
     *
     * @var array<string, true>
     */
    private array $reportedMissingCatalog = [];

    public function __construct(
        private readonly ContentSyncClient $client,
        private readonly GroupHandlers $handlers,
        private readonly ResourceRepository $resources,
        private readonly SyncStateRepository $states,
        private readonly SyncRunRepository $runs,
        private readonly ContentChangeRepository $changes,
        private readonly QfConfig $config,
    ) {}

    public function run(ResourceGroup $group, string $resourcesFilter): SyncRunResult
    {
        if ($group->isIgnored()) {
            Log::info('Quran Foundation sync skipped an ignored resource group.', [
                'resource_group' => $group->value,
            ]);

            return new SyncRunResult(mutationsApplied: 0, resourcesTouched: 0, rows: 0);
        }

        $handler = $this->handlers->for($group);
        $environment = SyncEnvironment::from($this->config->environment->value);
        $sourceId = $this->resources->sourceId('qf');

        if ($sourceId === null) {
            throw new SyncException('Quran Foundation content source is not seeded.');
        }

        $state = $this->states->find($environment, $group) ?? $this->states->create([
            'environment' => $environment,
            'resource_group' => $group->value,
            'resources_filter' => $resourcesFilter,
            'sync_token' => null,
            'last_sequence' => 0,
        ]);

        $run = $this->runs->create([
            'environment' => $environment,
            'resource_group' => $group->value,
            'started_at' => CarbonImmutable::now('UTC'),
            'status' => SyncRunStatus::Running,
            'mutations_applied' => 0,
        ]);

        $applied = 0;
        $rows = 0;
        /** @var array<int, int<0, max>> $touched */
        $touched = [];
        /** @var array<int, int<0, max>> $versions */
        $versions = [];
        $this->reportedMissingCatalog = [];

        try {
            $token = $this->applyPages(
                $handler,
                $state,
                $group,
                $sourceId,
                $resourcesFilter,
                $state->sync_token === null,
                $applied,
                $rows,
                $touched,
                $versions,
            );
            $this->finish($state, $run, $resourcesFilter, $token, $applied);
        } catch (Throwable $exception) {
            $this->markFailed($run, $state, $exception, $applied);
            $this->dispatchCommittedChanges($touched);

            throw $exception;
        }

        $this->dispatchCommittedChanges($touched);

        return new SyncRunResult(
            mutationsApplied: $applied,
            resourcesTouched: count($touched),
            rows: $rows,
        );
    }

    /**
     * @param  array<int, int<0, max>>  $touched
     * @param  array<int, int<0, max>>  $versions
     * @param  int<0, max>  $applied
     * @param  int<0, max>  $rows
     */
    private function applyPages(
        GroupHandler $handler,
        SyncState $state,
        ResourceGroup $group,
        int $sourceId,
        string $resourcesFilter,
        bool $bootstrap,
        int &$applied,
        int &$rows,
        array &$touched,
        array &$versions,
    ): string {
        $sawPage = false;
        $loggedIgnoredMutation = false;
        $token = '';
        /** @var array<int, CatalogEntry>|null $catalog */
        $catalog = null;

        foreach ($this->client->sync($resourcesFilter, $state->sync_token, $bootstrap) as $page) {
            $sawPage = true;
            $token = $page->nextSyncToken;
            $this->assertAscending($page);

            foreach ($page->mutations as $mutation) {
                if ($mutation->sequence <= (int) $state->last_sequence) {
                    continue;
                }

                if (ResourceGroup::tryFrom($mutation->resourceGroup)?->isIgnored() === true) {
                    if (! $loggedIgnoredMutation) {
                        $loggedIgnoredMutation = true;
                        Log::info('Quran Foundation sync skipped mutations for an ignored resource group.', [
                            'resource_group' => $mutation->resourceGroup,
                        ]);
                    }

                    continue;
                }

                $outcome = $this->applyMutation($handler, $state, $group, $sourceId, $mutation, $catalog, $versions);
                $applied++;
                $rows += $outcome['rows'];

                if ($outcome['resourceId'] !== null && $outcome['version'] !== null) {
                    $touched[$outcome['resourceId']] = $outcome['version'];
                }
            }
        }

        if (! $sawPage || $token === '') {
            throw new SyncException('Quran Foundation sync did not return a page.');
        }

        return $token;
    }

    /**
     * @param  array<int, CatalogEntry>|null  $catalog
     * @param  array<int, int<0, max>>  $versions
     * @return array{rows: int<0, max>, resourceId: int|null, version: int<0, max>|null}
     */
    private function applyMutation(
        GroupHandler $handler,
        SyncState $state,
        ResourceGroup $group,
        int $sourceId,
        Mutation $mutation,
        ?array &$catalog,
        array &$versions,
    ): array {
        if ($mutation->resourceGroup !== $group->value) {
            throw new SyncException('Sync mutation group does not match the run.');
        }

        if ($mutation->sequence < 0) {
            throw new SyncException('Sync mutation sequence is invalid.');
        }

        $snapshot = $this->snapshotFor($mutation);
        $entry = $this->needsMetadata($mutation) ? $this->catalogEntry($handler, $mutation->resourceId, $catalog) : null;
        $sequenceBefore = (int) $state->last_sequence;
        $versionsBefore = $versions;

        try {
            return DB::transaction(function () use ($handler, $state, $group, $sourceId, $mutation, $snapshot, $entry, &$versions): array {
                $resource = $this->resolveResource($sourceId, $group, $mutation);
                $this->applyMetadata($resource, $entry);

                if ($mutation->resourceContentId !== null) {
                    if ($mutation->resourceContentId < 0) {
                        throw new SyncException('Sync mutation resource content id is invalid.');
                    }

                    $resource->source_content_id = $mutation->resourceContentId;
                }

                $written = 0;
                $version = null;

                if ($mutation->type === MutationType::ResourceCreate || $mutation->type === MutationType::ResourceInvalidate) {
                    [$written, $version] = $this->applySnapshot($handler, $resource, $mutation, $snapshot, $versions);
                } elseif ($mutation->type === MutationType::ResourceDelete) {
                    $resource->is_active = false;
                    $version = $this->touchVersion($resource, $versions);
                    $resource->changes_floor_version = $version;
                } elseif ($mutation->type === MutationType::ResourceUpdate) {
                    $version = null;
                } else {
                    $change = $handler->applyRow($resource, $mutation);
                    $version = $this->touchVersion($resource, $versions);
                    $this->changes->insert($resource->id, $version, $change);
                    $written = 1;
                }

                $state->last_sequence = $mutation->sequence;
                $this->states->save($state);
                $this->resources->save($resource);

                return [
                    'rows' => $written,
                    'resourceId' => $version === null ? null : $resource->id,
                    'version' => $version,
                ];
            });
        } catch (Throwable $exception) {
            $state->last_sequence = $sequenceBefore;
            $versions = $versionsBefore;

            throw $exception;
        }
    }

    private function snapshotFor(Mutation $mutation): ?Snapshot
    {
        if ($mutation->type !== MutationType::ResourceCreate && $mutation->type !== MutationType::ResourceInvalidate) {
            return null;
        }

        if ($mutation->unavailableReason !== null && $mutation->unavailableReason !== '') {
            return null;
        }

        if ($mutation->snapshotUrl === null || $mutation->snapshotUrl === '') {
            throw new SyncException('Sync mutation is missing a snapshot URL.');
        }

        $snapshot = $this->client->snapshot($mutation->snapshotUrl);

        if ($snapshot->resourceId !== $mutation->resourceId) {
            throw new SyncException('Snapshot resource does not match the mutation.');
        }

        return $snapshot;
    }

    /**
     * @param  array<int, int<0, max>>  $versions
     * @return array{0: int<0, max>, 1: int<0, max>|null}
     */
    private function applySnapshot(
        GroupHandler $handler,
        Resource $resource,
        Mutation $mutation,
        ?Snapshot $snapshot,
        array &$versions,
    ): array {
        if ($mutation->unavailableReason !== null && $mutation->unavailableReason !== '') {
            $resource->is_active = false;
            $resource->unavailable_reason = $mutation->unavailableReason;

            return [0, null];
        }

        if ($snapshot === null) {
            throw new SyncException('Sync mutation is missing a snapshot URL.');
        }

        if ($snapshot->syncSequence < 0) {
            throw new SyncException('Snapshot sequence is invalid.');
        }

        $written = $handler->replaceFromSnapshot($resource, $snapshot);
        $version = $this->touchVersion($resource, $versions);
        $resource->changes_floor_version = $version;
        $resource->source_sequence = $snapshot->syncSequence;
        $resource->synced_at = CarbonImmutable::now('UTC');
        $resource->is_active = true;
        $resource->unavailable_reason = null;

        return [$written, $version];
    }

    private function resolveResource(int $sourceId, ResourceGroup $group, Mutation $mutation): Resource
    {
        $resource = $this->resources->findBySource($sourceId, $group, (string) $mutation->resourceId);

        if ($resource !== null) {
            return $resource;
        }

        if ($mutation->type !== MutationType::ResourceCreate && $mutation->type !== MutationType::ResourceInvalidate) {
            throw new SyncException('Sync mutation refers to a resource that does not exist.');
        }

        return $this->resources->create([
            'source_id' => $sourceId,
            'group' => $group,
            'source_key' => (string) $mutation->resourceId,
            'name' => null,
            'is_active' => true,
            'version' => 0,
            'changes_floor_version' => 0,
        ]);
    }

    /**
     * @param  array<int, CatalogEntry>|null  $catalog
     */
    private function catalogEntry(GroupHandler $handler, int $sourceKey, ?array &$catalog): ?CatalogEntry
    {
        if (! $handler->usesCatalog()) {
            return null;
        }

        if ($catalog === null) {
            $catalog = [];

            foreach ($handler->catalog() as $entry) {
                $catalog[$entry->id] = $entry;
            }
        }

        if (! isset($catalog[$sourceKey])) {
            $this->reportMissingCatalogEntry($handler->group(), $sourceKey);

            return null;
        }

        return $catalog[$sourceKey];
    }

    private function reportMissingCatalogEntry(ResourceGroup $group, int $sourceKey): void
    {
        $key = $group->value.':'.$sourceKey;

        if (isset($this->reportedMissingCatalog[$key])) {
            return;
        }

        $this->reportedMissingCatalog[$key] = true;

        Log::warning('Quran Foundation catalog has no entry for a resource.', [
            'resource_group' => $group->value,
            'resource_id' => $sourceKey,
        ]);
    }

    /**
     * @param  array<int, int<0, max>>  $touched
     */
    private function dispatchCommittedChanges(array $touched): void
    {
        foreach ($touched as $resourceId => $version) {
            ResourceContentChanged::dispatch($resourceId, $version);
        }
    }

    private function needsMetadata(Mutation $mutation): bool
    {
        return $mutation->type === MutationType::ResourceCreate
            || $mutation->type === MutationType::ResourceInvalidate
            || $mutation->type === MutationType::ResourceUpdate;
    }

    private function applyMetadata(Resource $resource, ?CatalogEntry $entry): void
    {
        if ($entry === null) {
            return;
        }

        $code = $entry->languageName === null ? null : LanguageCode::fromQfName($entry->languageName);
        $resource->name = $entry->name;
        $resource->author_name = $entry->authorName;
        $resource->language_name = $entry->languageName;
        $resource->language_code = $code?->value;
        $resource->direction = $code === null ? TextDirection::Ltr : $code->direction();
    }

    /**
     * @param  array<int, int<0, max>>  $versions
     * @return int<0, max>
     */
    private function touchVersion(Resource $resource, array &$versions): int
    {
        if (isset($versions[$resource->id])) {
            $resource->version = $versions[$resource->id];

            return $resource->version;
        }

        $next = $resource->version + 1;
        $resource->version = $next;
        $versions[$resource->id] = $next;

        return $next;
    }

    private function assertAscending(SyncPage $page): void
    {
        $previous = null;

        foreach ($page->mutations as $mutation) {
            if ($previous !== null && $mutation->sequence <= $previous) {
                throw new SyncException('Sync mutations are out of sequence.');
            }

            $previous = $mutation->sequence;
        }
    }

    /**
     * @param  int<0, max>  $applied
     */
    private function finish(SyncState $state, SyncRun $run, string $resourcesFilter, string $token, int $applied): void
    {
        DB::transaction(function () use ($state, $run, $resourcesFilter, $token, $applied): void {
            $state->sync_token = $token;
            $state->resources_filter = $resourcesFilter;
            $state->last_success_at = CarbonImmutable::now('UTC');
            $state->last_error = null;
            $this->states->save($state);

            $run->status = SyncRunStatus::Ok;
            $run->finished_at = CarbonImmutable::now('UTC');
            $run->mutations_applied = $applied;
            $run->error = null;
            $this->runs->save($run);
        });
    }

    /**
     * @param  int<0, max>  $applied
     */
    private function markFailed(SyncRun $run, SyncState $state, Throwable $exception, int $applied): void
    {
        try {
            $state->last_error = $exception->getMessage();
            $this->states->save($state);

            $run->status = SyncRunStatus::Failed;
            $run->finished_at = CarbonImmutable::now('UTC');
            $run->mutations_applied = $applied;
            $run->error = $exception->getMessage();
            $this->runs->save($run);
        } catch (Throwable) {
            // The original sync failure is the one the caller sees.
        }
    }
}
