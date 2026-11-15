<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Services;

use App\Domains\Azkar\Audio\AzkarAudioFiles;
use App\Domains\Azkar\Audio\AzkarAudioManifest;
use App\Domains\Azkar\Data\FlatItem;
use App\Domains\Azkar\Data\ImportPlan;
use App\Domains\Azkar\Data\ImportStats;
use App\Domains\Azkar\Data\TopicPlan;
use App\Domains\Azkar\Enums\AzkarEntryClass;
use App\Domains\Azkar\OpenDua\StepFlattener;
use App\Domains\Azkar\Sources\SourceProfile;
use Carbon\CarbonImmutable;

/**
 * Turns a validated catalogue into rows for the eight canonical tables (ADR 0031 transformation rules).
 * Reads config, the catalogue and the audio store's file sizes, and writes nothing. Entries in $blockedEntries are not emitted.
 *
 * Plan step 3: a reviewed dua outside the session categories gets home 'duas' (moved to Duas). Reviewed rows come from
 * config azkar_entry_types.php through EntryTypePolicy; with no reviewed rows, entry_class and home are null everywhere.
 *
 * ADR 0092 decisions 1-2: a chapter with a reviewed row in config azkar_topics.php has one browse topic (TopicPolicy).
 */
final class AzkarTransformer
{
    public const string HOME_DUAS = 'duas';

    public function __construct(
        private readonly StepFlattener $flattener,
        private readonly QuranSegmenter $segmenter,
        private readonly QuranReferencePolicy $policy,
        private readonly AzkarAudioManifest $audio,
        private readonly AzkarAudioFiles $files,
        private readonly EntryTypePolicy $entryTypes,
        private readonly TopicPolicy $topics,
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
        $typePlan = $this->entryTypes->resolve($this->entryTypeConfig());
        $topicPlan = $this->topicPlan();
        $topicIds = $this->topicIds();

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
                'entry_class' => ($typePlan->types[$entryKey] ?? null)?->value,
                // Set below, once the entry's category links exist (the session rule reads them).
                'home' => null,
            ];
            $entryMeta[] = ['id' => $entryId, 'chapter' => $chapterNumber, 'variations' => $variationIds, 'tags' => $fields['tags']];

            // ADR 0031 §12: notes attach to the entry by its key. Blocked entries stopped above, so they get none.
            foreach (($notesByEntryKey[$entryKey] ?? []) as $note) {
                $notes[] = ['id' => count($notes) + 1, 'entry_id' => $entryId] + $note;
            }
        }

        [$categories, $entryCategories] = $this->categories($entryMeta, $tags, $topicPlan, $topicIds);
        $entries = $this->withHome($entries, $entryCategories, $stats);
        $stats->candidatesNotApplied = count($typePlan->candidates);
        $stats->topicCandidatesNotApplied = count($topicPlan->candidates);
        $stats->topicRowsRejected = count($topicPlan->errors);
        $stats->browseEntriesByTopic = $this->browseEntriesByTopic($entryCategories, $topicIds);

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
     * Session categories (ADR 0031 §6), then browse topics. A catalogue tag named in config azkar.split_topics is not
     * emitted: its split topics take its place, in config order (developer request, 15 Nov 2026).
     *
     * ADR 0092 decisions 1-2: a chapter with a reviewed row leaves its catalogue tags and joins its one topic, so an entry
     * is listed once. A split row keeps only the catalogue tag it names, and that tag splits as before. The topics come
     * after the tags, in config order. A topic whose id is already a browse category is appended to it, with no repeated
     * entry. A tag category that the reviewed rows emptied is not emitted. Session categories never change.
     *
     * @param  list<array{id: int|string, chapter: int, variations: list<string>, tags: list<string>, entryId?: int}>  $entryMeta
     * @param  list<mixed>  $tags
     * @param  list<string>  $topicIds  The topics of config azkar_topics.php, in order.
     * @return array{0: list<array<string, int|string|null>>, 1: list<array<string, int|string|null>>}
     */
    private function categories(array $entryMeta, array $tags, TopicPlan $topicPlan, array $topicIds): array
    {
        $categories = [];
        $entryCategories = [];
        $progressPeriod = (string) config('azkar.progress_period', 'session');
        $sessions = config('azkar.session_categories', []);
        $sessions = is_array($sessions) ? $sessions : [];
        $timedVariations = [];
        $sessionKeys = [];
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

            $sessionKeys[(string) $categoryId] = $this->sessionKeys($entryMeta, $definition, $timedVariations);
            $ordinal = 0;

            foreach ($sessionKeys[(string) $categoryId] as $entryId => $variationKey) {
                $ordinal++;
                $entryCategories[] = [
                    'category_id' => (string) $categoryId,
                    'entry_id' => $entryId,
                    'variation_key' => $variationKey,
                    'position' => $ordinal,
                ];
            }
        }

        $splitTopics = $this->splitTopics();
        // Browse categories in emission order: category id => entry id => variation key.
        $browse = [];

        foreach ($this->tagIds($tags) as $tagId) {
            $split = $splitTopics[$tagId] ?? null;
            $whole = $this->browseTopics($tagId, $split, $entryMeta, $sessionKeys);
            $reviewed = $this->browseTopics($tagId, $split, $this->tagMeta($entryMeta, $tagId, $topicPlan), $sessionKeys);

            foreach ($reviewed as $index => $topic) {
                if ($topic['entries'] === [] && $whole[$index]['entries'] !== []) {
                    continue;
                }

                $this->addBrowseEntries($browse, $topic['id'], $topic['entries']);
            }
        }

        foreach ($topicIds as $topicId) {
            $entries = [];

            foreach ($entryMeta as $meta) {
                if (($topicPlan->topics[$meta['chapter']] ?? null) === $topicId) {
                    $entries[$meta['id']] = '*';
                }
            }

            if ($entries !== []) {
                $this->addBrowseEntries($browse, $topicId, $entries);
            }
        }

        foreach ($browse as $categoryId => $entries) {
            $position++;
            $categories[] = [
                'id' => (string) $categoryId,
                'kind' => 'browse',
                'position' => $position,
                'occasion' => null,
                'progress_period' => $progressPeriod,
            ];

            $ordinal = 0;

            foreach ($entries as $entryId => $variationKey) {
                $ordinal++;
                $entryCategories[] = [
                    'category_id' => (string) $categoryId,
                    'entry_id' => $entryId,
                    'variation_key' => $variationKey,
                    'position' => $ordinal,
                ];
            }
        }

        return [$categories, $entryCategories];
    }

    /**
     * Adds entries to a browse category, creating the category when it is new. An entry already in it is not added twice.
     *
     * @param  array<string, array<int|string, string>>  $browse  Category id => entry id => variation key, in emission order.
     * @param  array<int|string, string>  $entries
     */
    private function addBrowseEntries(array &$browse, string $categoryId, array $entries): void
    {
        $browse[$categoryId] ??= [];

        foreach ($entries as $entryId => $variationKey) {
            if (! array_key_exists($entryId, $browse[$categoryId])) {
                $browse[$categoryId][$entryId] = $variationKey;
            }
        }
    }

    /**
     * The entries a catalogue tag lists under ADR 0092: every entry except those of a chapter with a reviewed row. A
     * chapter with a split row keeps only the tag it names.
     *
     * @param  list<array{id: int|string, chapter: int, variations: list<string>, tags: list<string>, entryId?: int}>  $entryMeta
     * @return list<array{id: int|string, chapter: int, variations: list<string>, tags: list<string>, entryId?: int}>
     */
    private function tagMeta(array $entryMeta, string $tagId, TopicPlan $topicPlan): array
    {
        return array_values(array_filter($entryMeta, static function (array $meta) use ($tagId, $topicPlan): bool {
            if (isset($topicPlan->topics[$meta['chapter']])) {
                return false;
            }

            return ! isset($topicPlan->splits[$meta['chapter']]) || $topicPlan->splits[$meta['chapter']] === $tagId;
        }));
    }

    /**
     * The chapter rows of config azkar_topics.php, read through TopicPolicy (ADR 0092 decision 2).
     */
    private function topicPlan(): TopicPlan
    {
        [$topics, $chapters] = $this->topicConfig();

        return $this->topics->resolve($topics, $chapters, $this->splitTopics());
    }

    /**
     * The topic ids of config azkar_topics.php, in config order.
     *
     * @return list<string>
     */
    private function topicIds(): array
    {
        [$topics] = $this->topicConfig();

        return array_values(array_filter(array_keys($topics), is_string(...)));
    }

    /**
     * @return array{0: array<array-key, mixed>, 1: array<array-key, mixed>} The `topics` map and the `chapters` map.
     */
    private function topicConfig(): array
    {
        $topics = config('azkar_topics.topics', []);
        $chapters = config('azkar_topics.chapters', []);

        return [is_array($topics) ? $topics : [], is_array($chapters) ? $chapters : []];
    }

    /**
     * Entries per topic id, for the topics that have at least one entry (report counts, ADR 0092 decision 4).
     *
     * @param  list<array<string, int|string|null>>  $entryCategories
     * @param  list<string>  $topicIds
     * @return array<string, int>
     */
    private function browseEntriesByTopic(array $entryCategories, array $topicIds): array
    {
        $counts = [];

        foreach ($entryCategories as $link) {
            $categoryId = (string) $link['category_id'];

            if (in_array($categoryId, $topicIds, true)) {
                $counts[$categoryId] = ($counts[$categoryId] ?? 0) + 1;
            }
        }

        return $counts;
    }

    /**
     * The entries of one session category, with their variation keys. A timed session skips an entry that has only the
     * other timed variation.
     *
     * @param  list<array{id: int|string, chapter: int, variations: list<string>, tags: list<string>}>  $entryMeta
     * @param  array<array-key, mixed>  $definition
     * @param  list<string>  $timedVariations
     * @return array<int|string, string> Entry id => variation key.
     */
    private function sessionKeys(array $entryMeta, array $definition, array $timedVariations): array
    {
        $variation = is_string($definition['variation'] ?? null) ? $definition['variation'] : null;
        $keys = [];

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

            $keys[$meta['id']] = $variationKey;
        }

        return $keys;
    }

    /**
     * The browse topics that replace one catalogue tag: the tag itself, or its split topics from config azkar.split_topics.
     *
     * @param  list<array{id: int|string, chapter: int, variations: list<string>, tags: list<string>}>  $entryMeta
     * @param  array<string, array<int|string, string>>  $sessionKeys  Session id => entry id => variation key.
     * @return list<array{id: string, entries: array<int|string, string>}>
     */
    private function browseTopics(string $tagId, mixed $split, array $entryMeta, array $sessionKeys): array
    {
        if (! is_array($split)) {
            return [['id' => $tagId, 'entries' => $this->tagEntries($entryMeta, $tagId, null, $sessionKeys)]];
        }

        $topics = [];

        foreach ($split as $topicId => $rule) {
            $topics[] = [
                'id' => (string) $topicId,
                'entries' => $this->tagEntries($entryMeta, $tagId, is_array($rule) ? $rule : [], $sessionKeys),
            ];
        }

        return $topics;
    }

    /**
     * The entries of a tag, with their variation keys. A null rule takes the whole tag with the browse key '*'. A split rule
     * takes the tag's entries in session 'session' with that session's key, or the tag's entries not in session
     * 'except_session' with '*'.
     *
     * @param  list<array{id: int|string, chapter: int, variations: list<string>, tags: list<string>}>  $entryMeta
     * @param  array<array-key, mixed>|null  $rule
     * @param  array<string, array<int|string, string>>  $sessionKeys
     * @return array<int|string, string> Entry id => variation key.
     */
    private function tagEntries(array $entryMeta, string $tagId, ?array $rule, array $sessionKeys): array
    {
        $entries = [];

        foreach ($entryMeta as $meta) {
            if (! in_array($tagId, $meta['tags'], true)) {
                continue;
            }

            $entryId = $meta['id'];

            if ($rule === null) {
                $entries[$entryId] = '*';

                continue;
            }

            if (isset($rule['session'])) {
                $sessionId = (string) $rule['session'];

                if (array_key_exists($entryId, $sessionKeys[$sessionId] ?? [])) {
                    $entries[$entryId] = $sessionKeys[$sessionId][$entryId];
                }

                continue;
            }

            if (isset($rule['except_session'])) {
                $sessionId = (string) $rule['except_session'];

                if (! array_key_exists($entryId, $sessionKeys[$sessionId] ?? [])) {
                    $entries[$entryId] = '*';
                }
            }
        }

        return $entries;
    }

    /**
     * Config azkar.split_topics: catalogue tag id => topic id => rule.
     *
     * @return array<array-key, mixed>
     */
    private function splitTopics(): array
    {
        $splits = config('azkar.split_topics', []);

        return is_array($splits) ? $splits : [];
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
     * The `entries` map of config azkar_entry_types.php, read once per import.
     *
     * @return array<array-key, mixed>
     */
    private function entryTypeConfig(): array
    {
        $entries = config('azkar_entry_types.entries', []);

        return is_array($entries) ? $entries : [];
    }

    /**
     * Plan step 3 rule: a reviewed dua gets home 'duas' unless one of its final category links is a session category.
     * A browse topic does not keep it in Azkar (D2). Also tallies the report counts for entry types and moves.
     *
     * @param  list<array<string, int|string|null>>  $entries
     * @param  list<array<string, int|string|null>>  $entryCategories
     * @return list<array<string, int|string|null>>
     */
    private function withHome(array $entries, array $entryCategories, ImportStats $stats): array
    {
        $sessions = config('azkar.session_categories', []);
        $sessionIds = array_map('strval', array_keys(is_array($sessions) ? $sessions : []));
        $linksByEntry = [];

        foreach ($entryCategories as $link) {
            $linksByEntry[(int) $link['entry_id']][] = (string) $link['category_id'];
        }

        foreach ($entries as $index => $entry) {
            if ($entry['entry_class'] === AzkarEntryClass::Dhikr->value) {
                $stats->entryTypesDhikr++;
            }

            if ($entry['entry_class'] !== AzkarEntryClass::Dua->value) {
                continue;
            }

            $stats->entryTypesDua++;
            $linkedIds = $linksByEntry[(int) $entry['id']] ?? [];

            if (array_intersect($linkedIds, $sessionIds) !== []) {
                $stats->duasKeptInSessions++;

                continue;
            }

            $entries[$index]['home'] = self::HOME_DUAS;
            $stats->homeDuas++;

            foreach ($linkedIds as $categoryId) {
                $stats->homeDuasByCategory[$categoryId] = ($stats->homeDuasByCategory[$categoryId] ?? 0) + 1;
            }
        }

        return $entries;
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
