<?php

declare(strict_types=1);

namespace App\Domains\Content\Timings;

use App\Domains\Content\Enums\TaybahTimingKind;
use App\Domains\Content\Enums\TaybahTimingSource;
use App\Support\QuranText\ChapterVerseCounts;
use JsonException;

/**
 * Reads one committed timing file (format 1, ADR 0060). Refuses a file whose structure or identity does not match its
 * folder and name. Does not check the file against the database; the importer does that.
 */
final class TaybahTimingFileReader
{
    private const int FORMAT = 1;

    public function read(string $path, TaybahTimingKind $kind, string $recitationKey, int $chapter): TaybahTimingFile
    {
        $bytes = is_file($path) ? file_get_contents($path) : false;

        if ($bytes === false) {
            throw new TaybahTimingFileException('unreadable file');
        }

        try {
            $document = json_decode($bytes, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new TaybahTimingFileException('not valid JSON');
        }

        if (! is_array($document) || array_is_list($document)) {
            throw new TaybahTimingFileException('not a JSON object');
        }

        if ($this->field($document, 'format') !== self::FORMAT) {
            throw new TaybahTimingFileException('unsupported format');
        }

        if ($this->string($document, 'kind') !== $kind->value) {
            throw new TaybahTimingFileException('kind differs from the folder');
        }

        if ($this->string($document, 'recitation_key') !== $recitationKey) {
            throw new TaybahTimingFileException('recitation_key differs from the folder');
        }

        $chapterId = $this->int($document, 'chapter_id');

        if ($chapterId < 1 || $chapterId > ChapterVerseCounts::CHAPTERS) {
            throw new TaybahTimingFileException('chapter_id outside 1 to '.ChapterVerseCounts::CHAPTERS);
        }

        if ($chapterId !== $chapter) {
            throw new TaybahTimingFileException('chapter_id differs from the file name');
        }

        $source = TaybahTimingSource::tryFrom($this->string($document, 'source'));

        if (! $source instanceof TaybahTimingSource) {
            throw new TaybahTimingFileException('unknown source');
        }

        $audio = $this->array($document, 'audio');
        $models = $this->field($document, 'models');

        if ($models !== null && ! is_array($models)) {
            throw new TaybahTimingFileException('models must be an object or null');
        }

        $firstStart = $this->field($document, 'original_first_start_ms');

        if ($firstStart !== null && ! is_int($firstStart)) {
            throw new TaybahTimingFileException('original_first_start_ms must be an int or null');
        }

        return new TaybahTimingFile(
            kind: $kind,
            recitationKey: $recitationKey,
            chapterId: $chapterId,
            audioUrl: $this->string($audio, 'url'),
            audioBytes: $this->int($audio, 'bytes'),
            audioSha256: $this->string($audio, 'sha256'),
            measuredDurationMs: $this->int($audio, 'measured_duration_ms'),
            source: $source,
            toolVersion: $this->string($document, 'tool_version'),
            models: $models,
            originalFirstStartMs: $firstStart,
            fileSha256: hash('sha256', $bytes),
            ayahs: $this->ayahs($this->field($document, 'ayahs')),
        );
    }

    /**
     * @return list<TaybahTimingAyah>
     */
    private function ayahs(mixed $value): array
    {
        if (! is_array($value) || ! array_is_list($value)) {
            throw new TaybahTimingFileException('ayahs must be a list');
        }

        $ayahs = [];

        foreach ($value as $row) {
            if (! is_array($row)) {
                throw new TaybahTimingFileException('an ayah row is not an object');
            }

            $segments = $this->field($row, 'segments');

            if ($segments !== null && ! is_array($segments)) {
                // A value that is not a list is malformed, so the importer nulls the verse like any other bad segments.
                $segments = [];
            }

            $ayahs[] = new TaybahTimingAyah(
                verseKey: $this->string($row, 'verse_key'),
                verseId: $this->int($row, 'verse_id'),
                startMs: $this->int($row, 'start_ms'),
                endMs: $this->int($row, 'end_ms'),
                segments: $segments,
            );
        }

        return $ayahs;
    }

    /**
     * @param  array<array-key, mixed>  $data
     */
    private function field(array $data, string $key): mixed
    {
        if (! array_key_exists($key, $data)) {
            throw new TaybahTimingFileException("missing {$key}");
        }

        return $data[$key];
    }

    /**
     * @param  array<array-key, mixed>  $data
     */
    private function string(array $data, string $key): string
    {
        $value = $this->field($data, $key);

        if (! is_string($value)) {
            throw new TaybahTimingFileException("{$key} must be a string");
        }

        return $value;
    }

    /**
     * @param  array<array-key, mixed>  $data
     */
    private function int(array $data, string $key): int
    {
        $value = $this->field($data, $key);

        if (! is_int($value)) {
            throw new TaybahTimingFileException("{$key} must be an int");
        }

        return $value;
    }

    /**
     * @param  array<array-key, mixed>  $data
     * @return array<array-key, mixed>
     */
    private function array(array $data, string $key): array
    {
        $value = $this->field($data, $key);

        if (! is_array($value)) {
            throw new TaybahTimingFileException("{$key} must be an object");
        }

        return $value;
    }
}
