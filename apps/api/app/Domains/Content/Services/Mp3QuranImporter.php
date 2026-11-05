<?php

declare(strict_types=1);

namespace App\Domains\Content\Services;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Events\ResourceContentChanged;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Mp3Quran\Mp3QuranFileId;
use App\Domains\Content\Mp3Quran\Mp3QuranImportReport;
use App\Domains\Content\Mp3Quran\Mp3QuranManifest;
use App\Domains\Content\Mp3Quran\Mp3QuranManifestData;
use App\Domains\Content\Mp3Quran\Mp3QuranManifestException;
use App\Domains\Content\Mp3Quran\Mp3QuranMoshaf;
use App\Domains\Content\Repositories\Contracts\ChapterAudioFileRepository;
use App\Domains\Content\Repositories\Contracts\RecitationRepository;
use App\Domains\Content\Repositories\Contracts\RecitationTimingRepository;
use App\Domains\Content\Repositories\Contracts\ResourceRepository;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Imports the committed MP3Quran manifest into the content tables (ADR 0061). Idempotent: a moshaf whose fingerprint,
 * active flag and reason are unchanged writes nothing. Reads only the manifest file and the database.
 *
 * @phpstan-type Outcome array{outcome: 'created'|'updated'|'unchanged', resourceId: int, version: int, active: bool}
 */
final class Mp3QuranImporter
{
    private const string SOURCE = 'mp3quran';

    private const string QIRAT = 'Hafs';

    private const string FORMAT = 'mp3';

    public function __construct(
        private readonly Mp3QuranManifest $manifest,
        private readonly ResourceRepository $resources,
        private readonly RecitationRepository $recitations,
        private readonly ChapterAudioFileRepository $files,
        private readonly RecitationTimingRepository $timings,
        private readonly ResourceVersionService $versions,
        private readonly RecitationSegmentsFlagService $flags,
    ) {}

    /**
     * @param  string|null  $manifestPath  absolute path to the manifest; null reads quran.mp3quran_manifest_path
     *
     * @throws Mp3QuranManifestException when the manifest is refused or the source row is missing
     */
    public function import(bool $deferPack = false, bool $dryRun = false, ?string $manifestPath = null): Mp3QuranImportReport
    {
        $data = $this->manifest->load($manifestPath ?? (string) config('quran.mp3quran_manifest_path'));
        $sourceId = $this->resources->sourceId(self::SOURCE);

        if ($sourceId === null) {
            throw new Mp3QuranManifestException('content source mp3quran is not seeded');
        }

        if ($dryRun) {
            DB::beginTransaction();
        }

        try {
            return $this->run($data, $sourceId, $deferPack, $dryRun);
        } finally {
            if ($dryRun) {
                DB::rollBack();
            }
        }
    }

    private function run(Mp3QuranManifestData $data, int $sourceId, bool $deferPack, bool $dryRun): Mp3QuranImportReport
    {
        $duplicates = (array) config('quran.mp3quran_duplicates');
        $counts = ['created' => 0, 'updated' => 0, 'unchanged' => 0, 'hidden' => 0, 'deactivated' => 0, 'files' => 0, 'surahsWithoutFile' => 0];
        $events = [];
        $listed = [];

        foreach ($data->invalid as $skipped) {
            if ($skipped['moshaf_id'] !== null) {
                $listed[] = (string) $skipped['moshaf_id'];
            }
        }

        foreach ($data->moshafs as $moshaf) {
            $listed[] = (string) $moshaf->moshafId;
            $hidden = array_key_exists($moshaf->moshafId, $duplicates);
            $counts['hidden'] += $hidden ? 1 : 0;
            $counts['files'] += count($moshaf->files);
            $counts['surahsWithoutFile'] += $this->surahsWithoutFile($moshaf);

            $outcome = DB::transaction(fn (): array => $this->writeMoshaf(
                $moshaf,
                $sourceId,
                $hidden,
                $hidden ? 'duplicate_of_qf:'.(string) $duplicates[$moshaf->moshafId] : null,
            ));

            $counts[$outcome['outcome']]++;

            if ($outcome['outcome'] !== 'unchanged' && $outcome['active']) {
                $events[] = [$outcome['resourceId'], $outcome['version']];
            }
        }

        $counts['deactivated'] = $this->deactivateRemoved($sourceId, $listed);

        if (! $deferPack && ! $dryRun) {
            foreach ($events as [$resourceId, $version]) {
                ResourceContentChanged::dispatch($resourceId, $version);
            }
        }

        return new Mp3QuranImportReport(
            created: $counts['created'],
            updated: $counts['updated'],
            unchanged: $counts['unchanged'],
            hidden: $counts['hidden'],
            deactivated: $counts['deactivated'],
            files: $counts['files'],
            surahsWithoutFile: $counts['surahsWithoutFile'],
            skipped: $data->invalid,
        );
    }

    /**
     * @return Outcome
     */
    private function writeMoshaf(Mp3QuranMoshaf $moshaf, int $sourceId, bool $hidden, ?string $reason): array
    {
        $sourceKey = (string) $moshaf->moshafId;
        $existing = $this->resources->findBySource($sourceId, ResourceGroup::ChapterRecitations, $sourceKey);
        $isNew = ! $existing instanceof Resource;

        $resource = $existing ?? $this->resources->create([
            'source_id' => $sourceId,
            'group' => ResourceGroup::ChapterRecitations,
            'source_key' => $sourceKey,
            'name' => $moshaf->nameEn,
            'name_ar' => $moshaf->nameAr,
            'language_code' => null,
            'direction' => null,
            'version' => 0,
            'changes_floor_version' => 0,
            'is_active' => true,
        ]);

        $previousRecitation = $this->recitations->findForResource($resource->id);
        $keepsWordSegments = $previousRecitation instanceof Recitation && $previousRecitation->has_word_segments;
        $recitation = $this->recitations->upsertForResource($resource->id, [
            'reciter_name' => $moshaf->nameEn,
            'reciter_name_ar' => $moshaf->nameAr,
            'style' => $this->style($moshaf->moshafName),
            'qirat' => self::QIRAT,
            'has_word_segments' => $keepsWordSegments,
        ]);

        $fileRows = [];
        $desiredIds = [];

        foreach ($moshaf->files as $file) {
            $id = Mp3QuranFileId::for($moshaf->moshafId, $file->surah);
            $desiredIds[] = $id;
            $fileRows[] = [
                'id' => $id,
                'recitation_id' => $recitation->id,
                'chapter_id' => $file->surah,
                'audio_url' => $file->url,
                'size_bytes' => $file->bytes,
                'duration_ms' => $file->durationMs,
                'format' => self::FORMAT,
            ];
        }

        // Pilot cleanup (ADR 0061): an MP3Quran recitation owns no QF-style timing rows. Runs on every import.
        $previousFileIds = $this->files->idsFor($recitation->id);
        $timingsDeleted = $this->timings->deleteForFiles(array_values(array_unique([...$previousFileIds, ...$desiredIds])));
        $filesDeleted = $this->files->deleteForRecitationExcept($recitation->id, $desiredIds);

        foreach ($fileRows as $row) {
            $this->files->upsert($row);
        }

        $active = ! $hidden;
        $fingerprint = $this->fingerprint($moshaf);
        $changed = $isNew
            || $resource->import_fingerprint === null
            || ! hash_equals($resource->import_fingerprint, $fingerprint)
            || $resource->is_active !== $active
            || $resource->unavailable_reason !== $reason
            || $filesDeleted > 0
            || $timingsDeleted > 0;

        if (! $changed) {
            return ['outcome' => 'unchanged', 'resourceId' => $resource->id, 'version' => $resource->version, 'active' => $active];
        }

        $resource->import_fingerprint = $fingerprint;
        $resource->is_active = $active;
        $resource->unavailable_reason = $reason;
        $resource->name = $moshaf->nameEn;
        $resource->name_ar = $moshaf->nameAr;
        $resource->synced_at = CarbonImmutable::now();

        $version = $this->versions->bumpWithFloor($resource);
        $this->flags->refresh($recitation->id);

        return ['outcome' => $isNew ? 'created' : 'updated', 'resourceId' => $resource->id, 'version' => $version, 'active' => $active];
    }

    /**
     * Every mp3quran chapter recitation not listed in the manifest (valid or invalid) and still active is deactivated.
     * Its rows stay, so installed devices keep their files until the next pack build (ADR 0061 decision 13).
     *
     * @param  list<string>  $listed
     */
    private function deactivateRemoved(int $sourceId, array $listed): int
    {
        $deactivated = 0;

        foreach ($this->resources->forGroup($sourceId, ResourceGroup::ChapterRecitations) as $resource) {
            if (! $resource->is_active || in_array((string) $resource->source_key, $listed, true)) {
                continue;
            }

            DB::transaction(function () use ($resource): void {
                $resource->is_active = false;
                $resource->unavailable_reason = 'removed_from_manifest';
                $this->versions->bumpWithFloor($resource);
            });

            $deactivated++;
        }

        return $deactivated;
    }

    private function surahsWithoutFile(Mp3QuranMoshaf $moshaf): int
    {
        $have = array_map(static fn ($file): int => $file->surah, $moshaf->files);

        return count(array_filter($moshaf->surahList, static fn (int $surah): bool => ! in_array($surah, $have, true)));
    }

    /**
     * The text after the last " - " in moshaf_name, looked up in config (ADR 0061). Unknown or missing: null.
     */
    private function style(string $moshafName): ?string
    {
        $position = strrpos($moshafName, ' - ');

        if ($position === false) {
            return null;
        }

        $styles = (array) config('quran.mp3quran_styles');
        $style = $styles[trim(substr($moshafName, $position + 3))] ?? null;

        return is_string($style) ? $style : null;
    }

    private function fingerprint(Mp3QuranMoshaf $moshaf): string
    {
        $files = [];

        foreach ($moshaf->files as $file) {
            $files[] = [Mp3QuranFileId::for($moshaf->moshafId, $file->surah), $file->surah, $file->url, $file->bytes, $file->durationMs, self::FORMAT];
        }

        return hash('sha256', json_encode([
            'reciter_name' => $moshaf->nameEn,
            'reciter_name_ar' => $moshaf->nameAr,
            'style' => $this->style($moshaf->moshafName),
            'qirat' => self::QIRAT,
            'files' => $files,
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
}
