<?php

declare(strict_types=1);

namespace App\Domains\Content\Services;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\TaybahTimingKind;
use App\Domains\Content\Events\ResourceContentChanged;
use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Repositories\Contracts\ChapterAudioFileRepository;
use App\Domains\Content\Repositories\Contracts\RecitationRepository;
use App\Domains\Content\Repositories\Contracts\ResourceRepository;
use App\Domains\Content\Repositories\Contracts\TaybahTimingRepository;
use App\Domains\Content\Repositories\Contracts\WordLayoutRepository;
use App\Domains\Content\Timings\TaybahImportReport;
use App\Domains\Content\Timings\TaybahTimingAyah;
use App\Domains\Content\Timings\TaybahTimingFile;
use App\Domains\Content\Timings\TaybahTimingFileException;
use App\Domains\Content\Timings\TaybahTimingFileReader;
use App\Support\QuranText\ChapterVerseCounts;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Imports the committed timing files into taybah_timing_sets and taybah_recitation_timings (ADR 0060). Every file is
 * checked against the current chapter audio file and the QF word counts. Never deletes stored timings and never reads
 * QF or storage.
 *
 * @phpstan-type TimingSet array{recitation_id: int, chapter_id: int, audio_url: string, size_bytes: int, sha256: string, measured_duration_ms: int, source: \App\Domains\Content\Enums\TaybahTimingSource, tool_version: string|null, models: array<string, mixed>|null, original_first_start_ms: int|null, digest: string, imported_at: CarbonImmutable}
 * @phpstan-type TimingRow array{recitation_id: int, chapter_id: int, verse_id: int, start_ms: int, end_ms: int, segments: list<array{int, int, int}>|null}
 * @phpstan-type Discovered array{path: string, relative: string, kind: TaybahTimingKind, key: string, chapter: int}
 * @phpstan-type Prepared array{set: TimingSet, rows: list<TimingRow>, nulled: list<int>, unchanged: bool}
 */
final class TaybahTimingImporter
{
    /** The device limits in apps/mobile/src/features/audio/data/timings.ts: the last end may pass the audio by 2 s. */
    private const int MAX_OVERRUN_MS = 2000;

    private const int MIN_TAIL_MS = 15000;

    private const float TAIL_SHARE = 0.05;

    public function __construct(
        private readonly ResourceRepository $resources,
        private readonly RecitationRepository $recitations,
        private readonly ChapterAudioFileRepository $files,
        private readonly WordLayoutRepository $wordLayouts,
        private readonly TaybahTimingRepository $taybah,
        private readonly TaybahTimingFileReader $reader,
        private readonly RecitationSegmentsFlagService $flags,
        private readonly ResourceVersionService $versions,
    ) {}

    /**
     * @param  string|null  $root  absolute folder of {kind}/{key}/NNN.json files; null reads quran.recitation_timings.path
     */
    public function import(bool $deferPack = false, bool $dryRun = false, ?TaybahTimingKind $kind = null, ?string $recitationKey = null, ?string $root = null): TaybahImportReport
    {
        $discovered = $this->discover($kind, $recitationKey, $root);
        $skipped = [];
        $filesSeen = 0;
        $imported = 0;
        $unchanged = 0;
        $versionBumps = 0;
        $segmentsNulled = 0;

        foreach ($this->groups($discovered['files']) as $group) {
            $filesSeen += count($group);
            $first = $group[0];
            $skipAll = $this->groupSkipReason($first['kind'], $first['key']);
            $resolved = $skipAll === null ? $this->resolveRecitation($first['kind'], $first['key']) : null;

            if ($skipAll !== null || $resolved === null) {
                foreach ($group as $found) {
                    $skipped[] = ['path' => $found['relative'], 'reason' => $skipAll ?? 'no such recitation'];
                }

                continue;
            }

            [$resource, $recitation] = $resolved;
            $changes = [];

            foreach ($group as $found) {
                try {
                    $file = $this->reader->read($found['path'], $found['kind'], $found['key'], $found['chapter']);
                    $prepared = $this->prepare($file, $recitation, $found['relative']);
                } catch (TaybahTimingFileException $exception) {
                    $skipped[] = ['path' => $found['relative'], 'reason' => $exception->getMessage()];

                    continue;
                }

                $segmentsNulled += count($prepared['nulled']);

                if ($prepared['unchanged']) {
                    $unchanged++;

                    continue;
                }

                $changes[] = $prepared;
            }

            if ($changes === []) {
                continue;
            }

            $imported += count($changes);
            $versionBumps++;

            if ($dryRun) {
                continue;
            }

            $version = $this->write($recitation, $resource, $changes);

            if (! $deferPack && $resource->is_active) {
                ResourceContentChanged::dispatch($resource->id, $version);
            }
        }

        return new TaybahImportReport(
            filesSeen: $filesSeen + count($discovered['skipped']),
            imported: $imported,
            unchanged: $unchanged,
            versionBumps: $versionBumps,
            segmentsNulled: $segmentsNulled,
            skipped: [...$discovered['skipped'], ...$skipped],
        );
    }

    /**
     * @param  list<Prepared>  $changes
     */
    private function write(Recitation $recitation, Resource $resource, array $changes): int
    {
        return DB::transaction(function () use ($recitation, $resource, $changes): int {
            foreach ($changes as $change) {
                $this->taybah->upsertSet($change['set']);
                $this->taybah->deleteRows($recitation->id, $change['set']['chapter_id']);
                $this->taybah->insertRows($change['rows']);
            }

            $this->flags->refresh($recitation->id);

            return $this->versions->bumpWithFloor($resource);
        });
    }

    /**
     * Every check in plan A3, in order. Throws a TaybahTimingFileException with the reason when the file must be skipped.
     *
     * @return Prepared
     */
    private function prepare(TaybahTimingFile $file, Recitation $recitation, string $relative): array
    {
        $audio = $this->files->findForRecitationChapter($recitation->id, $file->chapterId);

        if (! $audio instanceof ChapterAudioFile) {
            throw new TaybahTimingFileException('no audio file');
        }

        if ($audio->audio_url !== $file->audioUrl) {
            throw new TaybahTimingFileException('audio url differs');
        }

        // ADR 0074 decision 6: the audio bytes must be the ones the file was measured on, for every kind but QF.
        if ($file->kind !== TaybahTimingKind::Qf && $audio->size_bytes !== $file->audioBytes) {
            throw new TaybahTimingFileException('size differs');
        }

        $chapter = $file->chapterId;
        $count = ChapterVerseCounts::forChapter($chapter);
        // A partial surah (ADR 0077 amendment) lists only its recorded ayahs, from first_ayah to last_ayah.
        $firstAyah = $audio->first_ayah ?? 1;
        $lastAyah = $audio->last_ayah ?? $count;

        if (count($file->ayahs) !== $lastAyah - $firstAyah + 1) {
            throw new TaybahTimingFileException('ayah rows do not match the surah');
        }

        foreach ($file->ayahs as $index => $ayah) {
            $ayahNumber = $firstAyah + $index;

            if ($ayah->verseKey !== $chapter.':'.$ayahNumber || $ayah->verseId !== ChapterVerseCounts::verseId($chapter, $ayahNumber)) {
                throw new TaybahTimingFileException('ayah rows do not match the surah');
            }
        }

        $this->assertContiguous($file->ayahs);

        $lastEnd = $file->ayahs[count($file->ayahs) - 1]->endMs;
        $measured = $file->measuredDurationMs;

        if ($lastEnd > $measured + self::MAX_OVERRUN_MS || $measured - $lastEnd > max(self::MIN_TAIL_MS, self::TAIL_SHARE * $measured)) {
            throw new TaybahTimingFileException('timings do not fit the audio');
        }

        $firstVerseId = ChapterVerseCounts::verseId($chapter, $firstAyah);
        $lastVerseId = ChapterVerseCounts::verseId($chapter, $lastAyah);
        $wordCounts = $this->wordLayouts->wordCountsForVerses(
            (int) config('quran.recitation_timings.word_count_mushaf_id'),
            $firstVerseId,
            $lastVerseId,
        );

        for ($verseId = $firstVerseId; $verseId <= $lastVerseId; $verseId++) {
            if (! isset($wordCounts[$verseId])) {
                throw new TaybahTimingFileException('word layouts missing');
            }
        }

        $rows = [];
        $nulled = [];

        foreach ($file->ayahs as $ayah) {
            $segments = null;

            if ($ayah->segments !== null) {
                $segments = $this->validSegments($ayah->segments, $wordCounts[$ayah->verseId]);

                if ($segments === null) {
                    $nulled[] = $ayah->verseId;
                }
            }

            $rows[] = [
                'recitation_id' => $recitation->id,
                'chapter_id' => $chapter,
                'verse_id' => $ayah->verseId,
                'start_ms' => $ayah->startMs,
                'end_ms' => $ayah->endMs,
                'segments' => $segments,
            ];
        }

        if ($nulled !== []) {
            Log::warning('Taybah timing segments nulled: positions do not match the QF word count', [
                'path' => $relative,
                'verses' => array_map(
                    fn (int $verseId): string => $this->verseKeyFor($verseId, $file->ayahs),
                    $nulled,
                ),
            ]);
        }

        $digest = hash('sha256', $file->fileSha256.':'.implode(',', $nulled));
        $existing = $this->taybah->findSet($recitation->id, $chapter);
        $unchanged = $existing !== null && $existing->digest === $digest && $existing->audio_url === $file->audioUrl;

        return [
            'set' => [
                'recitation_id' => $recitation->id,
                'chapter_id' => $chapter,
                'audio_url' => $file->audioUrl,
                'size_bytes' => $file->audioBytes,
                'sha256' => $file->audioSha256,
                'measured_duration_ms' => $measured,
                'source' => $file->source,
                'tool_version' => $file->toolVersion,
                'models' => $file->models,
                'original_first_start_ms' => $file->originalFirstStartMs,
                'digest' => $digest,
                'imported_at' => CarbonImmutable::now('UTC'),
            ],
            'rows' => $rows,
            'nulled' => $nulled,
            'unchanged' => $unchanged,
        ];
    }

    /**
     * @param  list<TaybahTimingAyah>  $ayahs
     */
    private function assertContiguous(array $ayahs): void
    {
        $previousEnd = 0;

        foreach ($ayahs as $index => $ayah) {
            if ($ayah->startMs < 0 || $ayah->startMs >= $ayah->endMs) {
                throw new TaybahTimingFileException('bad ayah range');
            }

            if ($index === 0 ? $ayah->startMs !== 0 : $ayah->startMs !== $previousEnd) {
                throw new TaybahTimingFileException('bad ayah range');
            }

            $previousEnd = $ayah->endMs;
        }
    }

    /**
     * The segments as [position, start_ms, end_ms] triples when every entry is well formed and the distinct positions
     * are exactly 1..N. Null otherwise: the verse keeps its ayah timing without segments.
     *
     * @param  array<mixed>  $segments
     * @return list<array{int, int, int}>|null
     */
    private function validSegments(array $segments, int $wordCount): ?array
    {
        $triples = [];
        $positions = [];

        foreach ($segments as $segment) {
            if (! is_array($segment) || count($segment) !== 3 || ! array_is_list($segment)) {
                return null;
            }

            [$position, $start, $end] = $segment;

            if (! is_int($position) || ! is_int($start) || ! is_int($end)) {
                return null;
            }

            if ($position < 1 || $start < 0 || $start >= $end) {
                return null;
            }

            $positions[$position] = true;
            $triples[] = [$position, $start, $end];
        }

        $distinct = array_keys($positions);
        sort($distinct);

        if ($distinct !== range(1, $wordCount)) {
            return null;
        }

        return $triples;
    }

    /**
     * @param  list<TaybahTimingAyah>  $ayahs
     */
    private function verseKeyFor(int $verseId, array $ayahs): string
    {
        foreach ($ayahs as $ayah) {
            if ($ayah->verseId === $verseId) {
                return $ayah->verseKey;
            }
        }

        return (string) $verseId;
    }

    /**
     * Files of each (kind, key) folder, in discovery order, as a list of groups.
     *
     * @param  list<Discovered>  $files
     * @return list<list<Discovered>>
     */
    private function groups(array $files): array
    {
        $groups = [];

        foreach ($files as $found) {
            $groups[$found['kind']->value.'/'.$found['key']][] = $found;
        }

        return array_values($groups);
    }

    /**
     * Reason every file of this folder is skipped, or null when the folder may be imported.
     */
    private function groupSkipReason(TaybahTimingKind $kind, string $key): ?string
    {
        if ($kind === TaybahTimingKind::Qf && in_array($key, $this->excludedQfKeys(), true)) {
            return 'excluded recitation';
        }

        return null;
    }

    /**
     * @return list<string>
     */
    private function excludedQfKeys(): array
    {
        $configured = config('quran.recitation_timings.excluded_qf_recitations', []);

        if (! is_array($configured)) {
            return [];
        }

        $keys = [];

        foreach ($configured as $id) {
            if (is_int($id) || is_string($id)) {
                $keys[] = (string) $id;
            }
        }

        return $keys;
    }

    /**
     * Source-scoped lookup (ADR 0060): a QF reciter 5 and an mp3quran moshaf 5 are different resources.
     *
     * @return array{resource, Recitation}|null
     */
    private function resolveRecitation(TaybahTimingKind $kind, string $key): ?array
    {
        $sourceId = $this->resources->sourceId($kind->value);

        if ($sourceId === null) {
            return null;
        }

        $resource = $this->resources->findBySource($sourceId, ResourceGroup::ChapterRecitations, $key);

        if (! $resource instanceof Resource) {
            return null;
        }

        $recitation = $this->recitations->findForResource($resource->id);

        if (! $recitation instanceof Recitation) {
            return null;
        }

        return [$resource, $recitation];
    }

    /**
     * Folders {root}/{kind}/{key}/{NNN}.json. Names that are not NNN.json are skipped with a reason.
     *
     * @return array{files: list<Discovered>, skipped: list<array{path: string, reason: string}>}
     */
    private function discover(?TaybahTimingKind $kind, ?string $recitationKey, ?string $configuredRoot): array
    {
        $root = rtrim($configuredRoot ?? (string) config('quran.recitation_timings.path'), '/');
        $files = [];
        $skipped = [];

        foreach ($kind === null ? TaybahTimingKind::cases() : [$kind] as $candidate) {
            foreach ($this->directories($root.'/'.$candidate->value) as $key) {
                if ($recitationKey !== null && $key !== $recitationKey) {
                    continue;
                }

                foreach ($this->jsonFiles($root.'/'.$candidate->value.'/'.$key) as $name) {
                    $relative = $candidate->value.'/'.$key.'/'.$name;

                    if (preg_match('/^(\d{3})\.json$/', $name, $matches) !== 1) {
                        $skipped[] = ['path' => $relative, 'reason' => 'bad file name'];

                        continue;
                    }

                    $files[] = [
                        'path' => $root.'/'.$relative,
                        'relative' => $relative,
                        'kind' => $candidate,
                        'key' => $key,
                        'chapter' => (int) $matches[1],
                    ];
                }
            }
        }

        return ['files' => $files, 'skipped' => $skipped];
    }

    /**
     * @return list<string>
     */
    private function directories(string $path): array
    {
        if (! is_dir($path)) {
            return [];
        }

        $names = array_values(array_filter(
            scandir($path) ?: [],
            static fn (string $name): bool => $name !== '.' && $name !== '..' && is_dir($path.'/'.$name),
        ));
        sort($names);

        return $names;
    }

    /**
     * @return list<string>
     */
    private function jsonFiles(string $path): array
    {
        $names = array_values(array_filter(
            scandir($path) ?: [],
            static fn (string $name): bool => str_ends_with($name, '.json') && is_file($path.'/'.$name),
        ));
        sort($names);

        return $names;
    }
}
