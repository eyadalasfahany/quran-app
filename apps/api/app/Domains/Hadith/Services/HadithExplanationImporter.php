<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Azkar\Exceptions\SnapshotException;
use App\Domains\Azkar\Sources\HadeethEncSnapshot;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\TextDirection;
use App\Domains\Content\Jobs\BuildContentPackJob;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Repositories\Contracts\ResourceRepository;
use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Exceptions\HadithExplanationException;
use App\Domains\Hadith\Overlay\HadithDataFiles;
use App\Domains\Hadith\Repositories\Contracts\HadithExplanationRepository;
use App\Support\Storage\SourceCache;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * ADR 0078 step 5: imports the pinned HadeethEnc snapshot and the committed links file. Stores only the explanations a link
 * names (a pack keeps only linked passages), byte for byte. Refuses a snapshot or links file whose hash differs from its pin.
 * A missing snapshot or links file is reported, not an error.
 */
final class HadithExplanationImporter
{
    public const string STATUS_NO_SNAPSHOT = 'no_snapshot';

    public const string STATUS_NO_LINKS = 'no_links';

    public const string STATUS_DRY_RUN = 'dry_run';

    public const string STATUS_IMPORTED = 'imported';

    public const string STATUS_UNCHANGED = 'unchanged';

    public const string LINKS_PATH = 'explanations/hadeethenc.json';

    private const string CONFIG_PREFIX = 'hadith_explanations.hadeethenc';

    private const string STORAGE_RELATIVE = 'hadith_explanations/hadeethenc';

    private const string RESOURCE_KEY = 'hadeethenc';

    public function __construct(
        private readonly HadithDataFiles $dataFiles,
        private readonly HadeethEncSnapshot $snapshot,
        private readonly HadithExplanationLinksFile $linksFile,
        private readonly HadithExplanationRepository $explanations,
        private readonly ResourceRepository $resources,
        private readonly PackBuilder $packs,
    ) {}

    /**
     * @return array{status: string, explanations: int, links: int, resource_id: ?int, version: ?int}
     *
     * @throws HadithExplanationException when a pin, a link or a record does not match
     * @throws SnapshotException when the snapshot does not match its pin or its manifest
     * @throws HadithDataFileException when the links file does not match its pin
     */
    public function run(bool $dryRun = false, bool $buildPacks = false): array
    {
        $date = (string) config(self::CONFIG_PREFIX.'.snapshot_date', '');
        $pin = (string) config(self::CONFIG_PREFIX.'.snapshot_sha256', '');
        $directory = SourceCache::path(self::STORAGE_RELATIVE.'/'.$date);

        if ($date === '' || $pin === '' || ! is_dir($directory)) {
            return $this->result(self::STATUS_NO_SNAPSHOT);
        }

        $records = $this->snapshot->load($directory, self::CONFIG_PREFIX);
        $manifest = json_decode((string) file_get_contents($directory.DIRECTORY_SEPARATOR.'manifest.json'), true, 512, JSON_THROW_ON_ERROR);

        if (! hash_equals($pin, (string) $manifest['sha256'])) {
            throw new HadithExplanationException('The HadeethEnc snapshot does not match its pin in config.');
        }

        $bytes = $this->dataFiles->readVerified(self::LINKS_PATH);

        if ($bytes === null) {
            return $this->result(self::STATUS_NO_LINKS);
        }

        $file = $this->linksFile->decode($bytes);

        if (! hash_equals($pin, $file['snapshot_sha256'])) {
            throw new HadithExplanationException('The explanation links file was made from another snapshot.');
        }

        $collections = (array) config('hadith.collections', []);
        $linkRows = [];
        $explanationIds = [];

        foreach ($file['links'] as $link) {
            if (! in_array($link['collection'], $collections, true)) {
                throw new HadithExplanationException('An explanation link names an unknown collection.');
            }

            if (! isset($records[$link['explanation_id']])) {
                throw new HadithExplanationException('An explanation link names a record that is not in the snapshot.');
            }

            $explanationIds[$link['explanation_id']] = true;
            $linkRows[] = [
                'collection_slug' => $link['collection'],
                'hadith_number' => $link['number'],
                'explanation_id' => $link['explanation_id'],
                'status' => $link['status'],
                'evidence' => $link['evidence'],
            ];
        }

        $sourceId = $this->resources->sourceId('hadeethenc');

        if ($sourceId === null) {
            throw new HadithExplanationException('The hadeethenc content source is missing.');
        }

        $now = CarbonImmutable::now('UTC');
        $explanationRows = [];

        foreach (array_keys($explanationIds) as $id) {
            $explanationRows[] = $this->explanationRow($id, $records[$id], (string) $manifest['files']['hadith-'.$id.'.json'], $sourceId, $date, $now);
        }

        $fingerprint = hash('sha256', $bytes.$pin);
        $existing = $this->resources->findBySource($sourceId, ResourceGroup::HadithExplanations, self::RESOURCE_KEY);

        if ($dryRun) {
            return $this->result(self::STATUS_DRY_RUN, count($explanationRows), count($linkRows));
        }

        if ($existing instanceof Resource && $existing->import_fingerprint !== null && hash_equals($existing->import_fingerprint, $fingerprint)) {
            return ['status' => self::STATUS_UNCHANGED, 'explanations' => count($explanationRows), 'links' => count($linkRows), 'resource_id' => $existing->id, 'version' => $existing->version];
        }

        $resource = DB::transaction(function () use ($sourceId, $fingerprint, $explanationRows, $linkRows): Resource {
            $resource = $this->resources->findBySource($sourceId, ResourceGroup::HadithExplanations, self::RESOURCE_KEY)
                ?? $this->resources->create([
                    'source_id' => $sourceId,
                    'group' => ResourceGroup::HadithExplanations,
                    'source_key' => self::RESOURCE_KEY,
                    'name' => self::RESOURCE_KEY,
                    'language_code' => 'ar',
                    'direction' => TextDirection::Rtl,
                    'version' => 0,
                    'changes_floor_version' => 0,
                    'is_active' => true,
                ]);

            $resource->version = $resource->version + 1;
            $resource->changes_floor_version = $resource->version;
            $resource->import_fingerprint = $fingerprint;
            $resource->is_active = true;
            $this->resources->save($resource);
            $this->explanations->replaceForResource($resource->id, $explanationRows, $linkRows);

            return $resource;
        });

        if ($buildPacks) {
            $this->packs->build($resource);
        } else {
            BuildContentPackJob::dispatch($resource->id);
        }

        return ['status' => self::STATUS_IMPORTED, 'explanations' => count($explanationRows), 'links' => count($linkRows), 'resource_id' => $resource->id, 'version' => $resource->version];
    }

    /**
     * @param  array<string, mixed>  $record
     * @return array<string, int|string|null>
     */
    private function explanationRow(int $id, array $record, string $sourceSha256, int $sourceId, string $date, CarbonImmutable $now): array
    {
        return [
            'id' => $id,
            'source_id' => $sourceId,
            'source_key' => (string) $id,
            'title_ar' => $this->text($record['title'] ?? null),
            'attribution_ar' => $this->text($record['attribution'] ?? null),
            'reference_ar' => $this->text($record['reference'] ?? null),
            'body_ar' => $this->text($record['explanation'] ?? null),
            'benefits_ar' => $this->encoded($record['hints'] ?? null),
            'words_ar' => $this->encoded($record['words_meanings'] ?? null),
            'intro_ar' => $this->text($record['hadeeth_intro'] ?? null),
            'grade_ar' => $this->text($record['grade'] ?? null),
            'source_url' => rtrim((string) config(self::CONFIG_PREFIX.'.site_url'), '/').'/'.$id,
            'source_sha256' => $sourceSha256,
            'source_version' => $date,
            'imported_at' => $now->format('Y-m-d H:i:s.u'),
        ];
    }

    /**
     * A string as the source gave it: never trimmed. An empty string is absent.
     */
    private function text(mixed $value): ?string
    {
        return is_string($value) && $value !== '' ? $value : null;
    }

    /**
     * A list or a string as JSON text (unescaped, so Arabic stays readable); an empty list is absent.
     */
    private function encoded(mixed $value): ?string
    {
        if (is_array($value)) {
            return $value === [] ? null : json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        }

        return $this->text($value);
    }

    /**
     * @return array{status: string, explanations: int, links: int, resource_id: ?int, version: ?int}
     */
    private function result(string $status, int $explanations = 0, int $links = 0): array
    {
        return ['status' => $status, 'explanations' => $explanations, 'links' => $links, 'resource_id' => null, 'version' => null];
    }
}
