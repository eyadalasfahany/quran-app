<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Report;

use App\Domains\Seerah\Canonical\CanonicalBuild;
use App\Domains\Seerah\Dataset\EventRecord;
use App\Domains\Seerah\Dataset\PlaceTree;
use App\Domains\Seerah\Dataset\YearRef;
use App\Domains\Seerah\Enums\Era;
use App\Domains\Seerah\Enums\ReviewStatus;
use App\Domains\Seerah\Review\ReviewRecords;
use App\Domains\Seerah\Validation\ValidationRun;

/**
 * Everything the report views read, computed once: the run, the place tree, the review status of every record, and the digest each
 * group would be signed with (the same digest seerah:approve writes).
 */
final class ReportContext
{
    private PlaceTree $tree;

    /** @var array<string, ReviewStatus> */
    private array $statuses = [];

    /** @var array<string, string> */
    private array $digests = [];

    /** @var array<string, array<string, string>> */
    private array $recordsByGroup = [];

    /**
     * @param  array<string, array{from: string, to: string, start_title: string, period: string}>  $batches
     */
    public function __construct(
        public readonly ValidationRun $run,
        public readonly CanonicalBuild $build,
        public readonly array $batches,
    ) {
        $this->tree = new PlaceTree($run->data->gazetteer->places ?? []);

        foreach (ReviewRecords::of($run->data) as $record) {
            $this->recordsByGroup[$record->group][$record->id] = $record->hash;
            $this->statuses[$record->group."\t".$record->id] = ReviewRecords::statusOf($record, $run->data);
        }

        foreach ($this->recordsByGroup as $group => $records) {
            $this->digests[$group] = ReviewRecords::digest($records);
        }
    }

    public function tree(): PlaceTree
    {
        return $this->tree;
    }

    public function status(string $group, string $id): ReviewStatus
    {
        return $this->statuses[$group."\t".$id] ?? ReviewStatus::Draft;
    }

    public function digest(string $group): string
    {
        return $this->digests[$group] ?? ReviewRecords::digest([]);
    }

    /**
     * @return array<string, string>
     */
    public function recordsOf(string $group): array
    {
        return $this->recordsByGroup[$group] ?? [];
    }

    /**
     * The place's path from the top of the tree, like «الحجاز › مكة › الكعبة».
     */
    public function placePath(string $placeId): string
    {
        $names = [];
        $place = $this->tree->get($placeId);

        if ($place !== null) {
            $names[] = $place->nameAr;
        }

        foreach ($this->tree->ancestors($placeId) as $ancestor) {
            $names[] = $this->tree->get($ancestor)->nameAr ?? $ancestor;
        }

        return implode(' › ', array_reverse($names));
    }

    /**
     * The book's paragraphs covered by an event (its span, or its whole section when the span is null).
     *
     * @return list<array{id: string, page: int, text: string}>
     */
    public function spanParagraphs(EventRecord $event): array
    {
        $indices = $this->run->index->coveredIndices($event->section, $event->span);

        if ($indices === null) {
            return [];
        }

        $rows = [];

        foreach (array_slice($this->run->index->paragraphsOf($event->section), $indices[0], $indices[1] - $indices[0] + 1) as $id) {
            $paragraph = $this->run->index->paragraph($id);

            if ($paragraph !== null) {
                $rows[] = ['id' => $id, 'page' => $paragraph->page, 'text' => $paragraph->text];
            }
        }

        return $rows;
    }

    public function paragraphText(string $id): ?string
    {
        return $this->run->index->paragraph($id)?->text;
    }

    /**
     * The year as a label: «ق.هـ ١٣», «هـ ٣», or «غير محدد» for the bucket and for an event with no year yet.
     */
    public function ageLabel(?YearRef $year): string
    {
        if ($year === null || $year->ageFrom === null || $year->era === null || $year->hijriFrom === null) {
            return 'غير محدد';
        }

        $prefix = $year->era === Era::BeforeHijra ? 'ق.هـ ' : 'هـ ';

        return 'age '.$year->ageFrom.' · '.$prefix.$year->hijriFrom;
    }

    /**
     * The batch that holds a section, or null.
     */
    public function batchOf(string $sectionId): ?string
    {
        $position = $this->run->index->sectionPosition($sectionId);

        if ($position === null) {
            return null;
        }

        foreach ($this->batches as $name => $batch) {
            $from = $this->run->index->sectionPosition($batch['from']);
            $to = $this->run->index->sectionPosition($batch['to']);

            if ($from !== null && $to !== null && $position >= $from && $position <= $to) {
                return (string) $name;
            }
        }

        return null;
    }
}
