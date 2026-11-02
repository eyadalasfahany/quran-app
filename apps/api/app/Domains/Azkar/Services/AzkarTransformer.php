<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Services;

use App\Domains\Azkar\Audio\AzkarAudioFiles;
use App\Domains\Azkar\Audio\AzkarAudioManifest;
use App\Domains\Azkar\Data\FlatItem;
use App\Domains\Azkar\Data\ImportPlan;
use App\Domains\Azkar\Data\ImportStats;
use App\Domains\Azkar\OpenDua\StepFlattener;
use App\Domains\Azkar\Sources\SourceProfile;
use Carbon\CarbonImmutable;

/**
 * Turns a validated catalogue into rows for the eight canonical tables (ADR 0031 transformation rules).
 * Reads config, the catalogue and the audio store's file sizes, and writes nothing. Entries in $blockedEntries are not emitted.
 */
final class AzkarTransformer
{
    public function __construct(
        private readonly StepFlattener $flattener,
        private readonly QuranSegmenter $segmenter,
        private readonly QuranReferencePolicy $policy,
        private readonly AzkarAudioManifest $audio,
        private readonly AzkarAudioFiles $files,
    ) {}

    /**
     * @param  array<string, mixed>  $catalogue
     * @param  array<int, true>  $blockedEntries  Entry indexes that have at least one error.
     * @param  array<string, list<array<string, mixed>>>  $notesByEntryKey  HadeethEnc notes by entry key (ADR 0031 §12).
     * @param  array<string, array{count: int, source: string}>  $requiredCountFills  Counts taken from the secondary source, by item key (ADR 0031 §6).
     */
    public function plan(array $catalogue, string $sourceVersion, int $importedAt, array $blockedEntries, SourceProfile $profile, array $notesByEntryKey = [], array $requiredCountFills = []): ImportPlan
    {
        $collectionId = $profile->collectionId;
        $rights = $this->recordingRights();
        $references = $this->references();
        $stats = new ImportStats(entriesBlocked: count($blockedEntries));

        [$chapters, $chapterNumberById] = $this->chapterRows($this->list($catalogue['chapters'] ?? null), $stats);
        $reciterNames = $this->reciterNames($this->list($catalogue['reciters'] ?? null));
        $tags = $this->list($catalogue['tags'] ?? null);

        $entries = [];
        $notes = [];
        $items = [];
        $segments = [];
        $recordings = [];
        $entryMeta = [];
        $positionByChapter = [];
        $itemId = 0;
        $recordingId = 0;
        $recordingIds = [];

        foreach ($this->list($catalogue['entries'] ?? null) as $index => $entry) {
            $entryId = $index + 1;
            $shape = $this->entryShape($entry, $chapterNumberById, $collectionId);

            if ($shape === null) {
                continue;
            }

            [$entryKey, $chapterNumber, $variations, $fields] = $shape;
            $positionByChapter[$chapterNumber] = ($positionByChapter[$chapterNumber] ?? 0) + 1;
            $blocked = isset($blockedEntries[$index]);
            $variationIds = [];

            foreach ($variations as $variation) {
                $variationIds[] = $variation['id'];
                $flat = $this->flattener->flatten($entryKey, $index, $variation['id'], $variation['steps']);
                $recordingIds = [...$recordingIds, ...$flat->recordingIds];

                foreach ($flat->items as $item) {
                    $this->tallyQuran($item, $references, $stats);
                }

                if ($blocked) {
                    continue;
                }

                foreach ($flat->items as $item) {
                    $itemId++;
                    // ADR 0031 §5: English is stored only when the licence covers it and the item holds no Quran segment.
                    $englishStored = $item->textAr === null || $this->spanCount($item->textAr) === 0;
                    [$requiredCount, $requiredCountSource] = $this->requiredCountOf($item, $profile, $requiredCountFills);
                    $this->countEnglish($item, $englishStored, $stats);
                    $this->countItem($item, $requiredCount, $requiredCountSource, $stats);

                    $items[] = [
                        'id' => $itemId,
                        'entry_id' => $entryId,
                        'item_key' => $item->itemKey,
                        'variation_key' => $item->variationKey,
                        'position' => $item->position,
                        'kind' => $item->kind,
                        'required_count' => $requiredCount,
                        'required_count_source' => $requiredCountSource,
                        'speaker' => $item->speaker,
                        'source_dua_id' => $item->sourceDuaId,
                        'text_en' => $englishStored ? $item->textEn : null,
                        'transliteration' => $englishStored ? $item->transliteration : null,
                        'source_text_sha256' => $item->textAr === null ? null : hash('sha256', $item->textAr),
                        'repeat_group' => $item->repeatGroup,
                        'repeat_times' => $item->repeatTimes,
                    ];

                    if ($item->textAr !== null) {
                        $itemSegments = $this->segmenter->segment($item->textAr, $this->referencesFor($item, $references));

                        foreach ($itemSegments as $segment) {
                            $segments[] = ['item_id' => $itemId] + $segment;

                            if ($segment['kind'] === 'text') {
                                $stats->segmentsText++;
                            } else {
                                $stats->segmentsQuran++;
                            }
                        }
                    }

                    foreach ($item->recordings as $recording) {
                        $file = $this->audioFile($recording['url']);

                        // ADR 0040 §2: the app gets only Taybah's own URL, so a recording without its file is left out.
                        if ($file === null) {
                            $stats->recordingsMissingFile++;

                            continue;
                        }

                        $recordingId++;
                        $recordings[] = [
                            'id' => $recordingId,
                            'recording_key' => $item->itemKey.':'.$recording['id'],
                            'item_id' => $itemId,
                            'reciter_name' => $reciterNames[$recording['reciterId']] ?? $recording['reciterId'],
                            'reciter_name_ar' => null,
                            'source' => 'opendua',
                            'remote_url' => $file['remote_url'],
                            'duration_ms' => $recording['durationSeconds'] * 1000,
                            'size_bytes' => $file['size_bytes'],
                            // ADR 0045 (2 Nov 2026): streaming and download are always allowed for a shipped recording.
                            'stream_allowed' => 1,
                            'download_allowed' => 1,
                            'redistribution_allowed' => $rights['redistribution_allowed'],
                            'attribution_ar' => $rights['attribution_ar'],
                            'attribution_en' => $rights['attribution_en'],
                            'licence' => $rights['licence'],
                            'licence_url' => $rights['licence_url'],
                            'rights_verified_at' => $rights['rights_verified_at'],
                        ];
                    }
                }
            }

            if ($blocked) {
                continue;
            }

            $entries[] = [
                'id' => $entryId,
                'entry_key' => $entryKey,
                'chapter_id' => $chapterNumber,
                'position' => $positionByChapter[$chapterNumber],
                'source_reference' => $fields['sourceReference'],
                'entry_type' => $fields['type'],
                'occasion' => $fields['timing']['occasion'],
                'timing_type' => $fields['timing']['timing_type'],
                'timing_prayer' => $fields['timing']['timing_prayer'],
                'timing_policy_id' => null,
                'review_status' => 'sourced',
                'source_version' => $sourceVersion,
                'imported_at' => $importedAt,
            ];
            $entryMeta[] = ['id' => $entryId, 'chapter' => $chapterNumber, 'variations' => $variationIds, 'tags' => $fields['tags']];

            // ADR 0031 §12: notes attach to the entry by its key. Blocked entries stopped above, so they get none.
            foreach (($notesByEntryKey[$entryKey] ?? []) as $note) {
                $notes[] = ['id' => count($notes) + 1, 'entry_id' => $entryId] + $note;
            }
        }

        [$categories, $entryCategories] = $this->categories($entryMeta, $tags);

        // Upstream counts.recordings counts distinct recording ids; one id may sit in two places (ADR 0031 §6, report).
        $stats->recordingObjects = count($recordingIds);
        $stats->recordingsUpstream = count(array_unique(array_filter($recordingIds, static fn (string $id): bool => $id !== '')));
        $stats->entries = count($entries);
        $stats->recordingsImported = count($recordings);
        $stats->recordingsDownloadable = count($recordings);

        return new ImportPlan(
            chapters: $chapters,
            entries: $entries,
            items: $items,
            segments: $segments,
            categories: $categories,
            entryCategories: $entryCategories,
            notes: $notes,
            recordings: $recordings,
            stats: $stats,
        );
    }

    /**
     * The chapter table comes from every chapter, in upstream order. Its title_ar is the reviewed title, or null.
     *
     * @param  list<mixed>  $chapters
     * @return array{0: list<array<string, int|string|null>>, 1: array<string, int>}
     */
    private function chapterRows(array $chapters, ImportStats $stats): array
    {
        $rows = [];
        $numberById = [];
        $titles = config('azkar.chapter_titles_ar', []);
        $titles = is_array($titles) ? $titles : [];

        foreach ($chapters as $chapter) {
            if (! is_array($chapter) || ! is_string($chapter['id'] ?? null) || ! is_int($chapter['number'] ?? null) || ! is_string($chapter['title'] ?? null)) {
                continue;
            }

            $number = $chapter['number'];
            $titleAr = is_string($chapter['titleAr'] ?? null) && $chapter['titleAr'] !== ''
                ? $chapter['titleAr']
                : (is_string($titles[$number] ?? null) && $titles[$number] !== '' ? $titles[$number] : null);

            if ($titleAr === null) {
                $stats->chaptersWithoutArabicTitle++;
            }

            $rows[] = [
                'id' => $number,
                'source_chapter_id' => $chapter['id'],
                'number' => $number,
                'title_ar' => $titleAr,
                'title_en' => $chapter['title'] === '' ? null : $chapter['title'],
            ];
            $numberById[$chapter['id']] = $number;
        }

        $stats->chapters = count($rows);

        return [$rows, $numberById];
    }

    /**
     * @param  list<mixed>  $reciters
     * @return array<string, string>
     */
    private function reciterNames(array $reciters): array
    {
        $names = [];

        foreach ($reciters as $reciter) {
            if (is_array($reciter) && is_string($reciter['id'] ?? null) && is_string($reciter['name'] ?? null)) {
                $names[$reciter['id']] = $reciter['name'];
            }
        }

        return $names;
    }

    /**
     * Entry-level facts used by the transform, or null when the entry cannot be emitted.
     *
     * @param  array<string, int>  $chapterNumberById
     * @return array{0: string, 1: int, 2: list<array{id: string, steps: list<mixed>}>, 3: array{sourceReference: string, type: string, timing: array{occasion: string|null, timing_type: string|null, timing_prayer: string|null}, tags: list<string>}}|null
     */
    private function entryShape(mixed $entry, array $chapterNumberById, string $collectionId): ?array
    {
        if (! is_array($entry) || ! is_string($entry['id'] ?? null) || ! is_string($entry['chapterId'] ?? null)) {
            return null;
        }

        $chapterNumber = $chapterNumberById[$entry['chapterId']] ?? null;
        $variations = $this->flattener->variationsOf($entry);
        $sourceReference = $entry['sourceReference'] ?? null;
        $type = $entry['type'] ?? null;
        $tags = $entry['tags'] ?? null;

        if ($chapterNumber === null || $variations === null || ! is_string($sourceReference) || ! is_string($type) || ! is_array($tags) || ! array_is_list($tags)) {
            return null;
        }

        $timing = $this->timing($chapterNumber);

        return [
            $collectionId.':'.$entry['id'],
            $chapterNumber,
            $variations,
            [
                'sourceReference' => $sourceReference,
                'type' => $type,
                'timing' => $timing,
                'tags' => array_values(array_filter($tags, is_string(...))),
            ],
        ];
    }

    /**
     * @return array{occasion: string|null, timing_type: string|null, timing_prayer: string|null}
     */
    private function timing(int $chapterNumber): array
    {
        $timing = config('azkar.chapter_timing', []);
        $row = is_array($timing) && is_array($timing[$chapterNumber] ?? null) ? $timing[$chapterNumber] : [];

        return [
            'occasion' => is_string($row['occasion'] ?? null) ? $row['occasion'] : null,
            'timing_type' => is_string($row['timing_type'] ?? null) ? $row['timing_type'] : null,
            'timing_prayer' => is_string($row['timing_prayer'] ?? null) ? $row['timing_prayer'] : null,
        ];
    }

    /**
     * ADR 0031 §4 counting: every passage is either mapped to a reviewed row or unmapped.
     *
     * @param  array<string, list<list<array{0: int, 1: int, 2: int|null}>>>  $references
     */
    private function tallyQuran(FlatItem $item, array $references, ImportStats $stats): void
    {
        if ($item->textAr === null) {
            return;
        }

        $spans = $this->spanCount($item->textAr);

        if ($spans === 0) {
            return;
        }

        if (count($this->referencesFor($item, $references)) === $spans) {
            $stats->quranPassagesMapped += $spans;
        } else {
            $stats->quranPassagesUnmapped += $spans;
        }
    }

    private function countEnglish(FlatItem $item, bool $stored, ImportStats $stats): void
    {
        if ($item->textEn === null && $item->transliteration === null) {
            return;
        }

        if ($stored) {
            $stats->englishStored++;
        } else {
            $stats->englishSkipped++;
        }
    }

    /**
     * The primary's own count, or the secondary's count for an item the primary left empty (ADR 0031 §6, §12).
     *
     * @param  array<string, array{count: int, source: string}>  $fills
     * @return array{0: int|null, 1: string|null}
     */
    private function requiredCountOf(FlatItem $item, SourceProfile $profile, array $fills): array
    {
        if ($item->requiredCount !== null) {
            return [$item->requiredCount, $profile->code];
        }

        $fill = $fills[$item->itemKey] ?? null;

        return $fill === null ? [null, null] : [$fill['count'], $fill['source']];
    }

    private function countItem(FlatItem $item, ?int $requiredCount, ?string $requiredCountSource, ImportStats $stats): void
    {
        match ($item->kind) {
            'recitation' => $stats->itemsRecitation++,
            'instruction' => $stats->itemsInstruction++,
            default => $stats->itemsNarration++,
        };

        if ($requiredCount === null || $requiredCountSource === null) {
            $stats->itemsWithoutRequiredCount++;

            return;
        }

        $stats->itemsWithRequiredCount++;
        $stats->requiredCountBySource[$requiredCountSource] = ($stats->requiredCountBySource[$requiredCountSource] ?? 0) + 1;
    }

    /**
     * @param  list<array{id: int|string, chapter: int, variations: list<string>, tags: list<string>, entryId?: int}>  $entryMeta
     * @param  list<mixed>  $tags
     * @return array{0: list<array<string, int|string|null>>, 1: list<array<string, int|string|null>>}
     */
    private function categories(array $entryMeta, array $tags): array
    {
        $categories = [];
        $entryCategories = [];
        $progressPeriod = (string) config('azkar.progress_period', 'session');
        $sessions = config('azkar.session_categories', []);
        $sessions = is_array($sessions) ? $sessions : [];
        $timedVariations = [];
        $position = 0;

        foreach ($sessions as $definition) {
            if (is_array($definition) && is_string($definition['variation'] ?? null)) {
                $timedVariations[] = $definition['variation'];
            }
        }

        foreach ($sessions as $categoryId => $definition) {
            $definition = is_array($definition) ? $definition : [];
            $position++;
            $categories[] = [
                'id' => (string) $categoryId,
                'kind' => 'session',
                'position' => $position,
                'occasion' => is_string($definition['occasion'] ?? null) ? $definition['occasion'] : null,
                'progress_period' => $progressPeriod,
            ];

            $ordinal = 0;
            $variation = is_string($definition['variation'] ?? null) ? $definition['variation'] : null;

            foreach ($entryMeta as $meta) {
                if ($meta['chapter'] !== ($definition['chapter'] ?? null)) {
                    continue;
                }

                $variationKey = '*';

                if ($variation !== null) {
                    if (in_array($variation, $meta['variations'], true)) {
                        $variationKey = $variation;
                    } elseif (array_intersect($meta['variations'], $timedVariations) !== []) {
                        continue;
                    }
                }

                $ordinal++;
                $entryCategories[] = [
                    'category_id' => (string) $categoryId,
                    'entry_id' => $meta['id'],
                    'variation_key' => $variationKey,
                    'position' => $ordinal,
                ];
            }
        }

        foreach ($this->tagIds($tags) as $tagId) {
            $position++;
            $categories[] = [
                'id' => $tagId,
                'kind' => 'browse',
                'position' => $position,
                'occasion' => null,
                'progress_period' => $progressPeriod,
            ];

            $ordinal = 0;

            foreach ($entryMeta as $meta) {
                if (! in_array($tagId, $meta['tags'], true)) {
                    continue;
                }

                $ordinal++;
                $entryCategories[] = [
                    'category_id' => $tagId,
                    'entry_id' => $meta['id'],
                    'variation_key' => '*',
                    'position' => $ordinal,
                ];
            }
        }

        return [$categories, $entryCategories];
    }

    /**
     * @param  list<mixed>  $tags
     * @return list<string>
     */
    private function tagIds(array $tags): array
    {
        $ids = [];

        foreach ($tags as $tag) {
            if (is_array($tag) && is_string($tag['id'] ?? null)) {
                $ids[] = $tag['id'];
            }
        }

        return $ids;
    }

    /**
     * The Taybah-hosted file for an upstream recording URL (ADR 0040 §2), matched by its file name. Null when the file
     * is not in the audio store. The row never carries the upstream URL.
     *
     * @return array{remote_url: string, size_bytes: int}|null
     */
    private function audioFile(string $upstreamUrl): ?array
    {
        $name = basename((string) parse_url($upstreamUrl, PHP_URL_PATH));
        $track = $name === '' ? null : $this->audio->track($name);

        // The file must be a shipped track of the pinned manifest, and be on the disk at the manifest's size.
        if ($track === null || ! $this->files->hasExpectedSize($track)) {
            return null;
        }

        return ['remote_url' => '/api/v1/azkar/audio/'.$this->files->version().'/'.$name, 'size_bytes' => $track->bytes];
    }

    /**
     * @return array{redistribution_allowed: int, attribution_ar: string|null, attribution_en: string|null, licence: string, licence_url: string|null, rights_verified_at: int|null}
     */
    private function recordingRights(): array
    {
        $rights = config('azkar.recording_rights', []);
        $rights = is_array($rights) ? $rights : [];
        $verifiedAt = is_string($rights['rights_verified_at'] ?? null) ? CarbonImmutable::parse($rights['rights_verified_at'], 'UTC')->getTimestampMs() : null;

        return [
            'redistribution_allowed' => ($rights['redistribution_allowed'] ?? false) === true ? 1 : 0,
            'attribution_ar' => is_string($rights['attribution_ar'] ?? null) ? $rights['attribution_ar'] : null,
            'attribution_en' => is_string($rights['attribution_en'] ?? null) ? $rights['attribution_en'] : null,
            'licence' => is_string($rights['licence'] ?? null) ? $rights['licence'] : '',
            'licence_url' => is_string($rights['licence_url'] ?? null) ? $rights['licence_url'] : null,
            'rights_verified_at' => $verifiedAt,
        ];
    }

    /**
     * The usable Quran reference rows, keyed by item_key. Rows the policy does not accept are dropped here; the
     * validator has already failed them, so an accepted entry always has one range per span.
     *
     * @return array<string, list<list<array{0: int, 1: int, 2: int|null}>>>
     */
    private function references(): array
    {
        $raw = config('azkar.quran_references', []);
        $map = [];

        if (! is_array($raw)) {
            return $map;
        }

        foreach ($raw as $itemKey => $rows) {
            if (! is_string($itemKey) || ! is_array($rows)) {
                continue;
            }

            $map[$itemKey] = [];

            foreach ($rows as $row) {
                $parsed = $this->policy->parse($row);

                if ($parsed === null || $parsed['surah'] === null || $parsed['from'] === null) {
                    continue;
                }

                $decision = $this->policy->decide($parsed);

                if (! in_array($decision, [QuranReferencePolicy::DECISION_ACCEPT, QuranReferencePolicy::DECISION_WARN_CANDIDATE], true)) {
                    continue;
                }

                $map[$itemKey][] = $parsed['ranges'];
            }
        }

        return $map;
    }

    /**
     * @param  array<string, list<list<array{0: int, 1: int, 2: int|null}>>>  $references
     * @return list<list<array{0: int, 1: int, 2: int|null}>>
     */
    private function referencesFor(FlatItem $item, array $references): array
    {
        if ($item->textAr === null || $this->spanCount($item->textAr) === 0) {
            return [];
        }

        return $references[$item->itemKey] ?? [];
    }

    private function spanCount(string $text): int
    {
        return $this->segmenter->scan($text)['spans'];
    }

    /**
     * @return list<mixed>
     */
    private function list(mixed $value): array
    {
        return is_array($value) && array_is_list($value) ? $value : [];
    }
}
