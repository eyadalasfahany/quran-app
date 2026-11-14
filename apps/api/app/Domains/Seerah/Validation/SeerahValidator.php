<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation;

use App\Domains\Seerah\Canonical\CanonicalBuild;
use App\Domains\Seerah\Dataset\BookIndex;
use App\Domains\Seerah\Dataset\SeerahDatasetLoader;
use App\Domains\Seerah\Validation\Rules\V10Decisions;
use App\Domains\Seerah\Validation\Rules\V11Ages;
use App\Domains\Seerah\Validation\Rules\V12Order;
use App\Domains\Seerah\Validation\Rules\V13Coverage;
use App\Domains\Seerah\Validation\Rules\V14Routes;
use App\Domains\Seerah\Validation\Rules\V15Milestones;
use App\Domains\Seerah\Validation\Rules\V16BracedRuns;
use App\Domains\Seerah\Validation\Rules\V17ReviewState;
use App\Domains\Seerah\Validation\Rules\V18Vocabulary;
use App\Domains\Seerah\Validation\Rules\V19Counts;
use App\Domains\Seerah\Validation\Rules\V1SourcePins;
use App\Domains\Seerah\Validation\Rules\V2FileShape;
use App\Domains\Seerah\Validation\Rules\V3Quotes;
use App\Domains\Seerah\Validation\Rules\V4PlaceTree;
use App\Domains\Seerah\Validation\Rules\V5PlaceNames;
use App\Domains\Seerah\Validation\Rules\V6Geo;
use App\Domains\Seerah\Validation\Rules\V7DrawnPositions;
use App\Domains\Seerah\Validation\Rules\V8Sections;
use App\Domains\Seerah\Validation\Rules\V9Evidence;
use App\Domains\Seerah\Validation\Rules\ValidationRule;

/**
 * Runs V1 to V19 (data-format.md) over the data folder and the canonical book. Structure mode (the default, CI) allows drafts;
 * release mode also needs every record approved. --complete makes an uncovered section, a missing milestone and a missing count
 * an error. A run over another file (`$build->pinsChecked` false) checks no pins and no counts.
 */
final class SeerahValidator
{
    /**
     * @return list<ValidationRule>
     */
    private function rules(): array
    {
        return [
            new V1SourcePins, new V2FileShape, new V3Quotes, new V4PlaceTree, new V5PlaceNames, new V6Geo,
            new V7DrawnPositions, new V8Sections, new V9Evidence, new V10Decisions, new V11Ages, new V12Order,
            new V13Coverage, new V14Routes, new V15Milestones, new V16BracedRuns, new V17ReviewState, new V18Vocabulary,
            new V19Counts,
        ];
    }

    public function validate(string $directory, CanonicalBuild $build, bool $release, bool $complete): ValidationRun
    {
        $issues = new IssueBag;
        $batches = $this->batches();
        $dataset = (new SeerahDatasetLoader)->load($directory, array_keys($batches), $issues);
        $yearHeadings = $this->yearHeadings();
        $index = new BookIndex($build->book, $yearHeadings);

        $context = new ValidationContext(
            sourceSha256: $build->sourceSha256,
            release: $release,
            complete: $complete,
            pins: $build->pinsChecked ? [
                'source_sha256' => (string) config('seerah.source.sha256'),
                'canonical_sha256' => config('seerah.canonical_sha256') === null ? null : (string) config('seerah.canonical_sha256'),
            ] : null,
            book: $build->book,
            index: $index,
            data: $dataset,
            batches: $batches,
            yearHeadings: $yearHeadings,
            milestoneKeys: $this->strings(config('seerah.milestones')),
            geoBox: $this->geoBox(),
            counts: $build->pinsChecked ? $this->counts() : null,
            ageMin: (int) config('seerah.age.min', 0),
            ageMax: (int) config('seerah.age.max', 63),
        );

        foreach ($this->rules() as $rule) {
            $rule->check($context, $issues);
        }

        return new ValidationRun($issues, $dataset, $index);
    }

    /**
     * @return array<string, array{from: string, to: string, start_title: string, period: string}>
     */
    private function batches(): array
    {
        $batches = [];

        foreach ((array) config('seerah.batches', []) as $name => $batch) {
            if (! is_array($batch)) {
                continue;
            }

            $batches[(string) $name] = [
                'from' => (string) ($batch['from'] ?? ''),
                'to' => (string) ($batch['to'] ?? ''),
                'start_title' => (string) ($batch['start_title'] ?? ''),
                'period' => (string) ($batch['period'] ?? ''),
            ];
        }

        return $batches;
    }

    /**
     * @return array<string, int>
     */
    private function yearHeadings(): array
    {
        $years = [];

        foreach ((array) config('seerah.year_headings', []) as $title => $year) {
            $years[(string) $title] = (int) $year;
        }

        return $years;
    }

    /**
     * @return array{south: float, west: float, north: float, east: float}
     */
    private function geoBox(): array
    {
        $box = (array) config('seerah.geo_box', []);

        return [
            'south' => (float) ($box['south'] ?? 0),
            'west' => (float) ($box['west'] ?? 0),
            'north' => (float) ($box['north'] ?? 0),
            'east' => (float) ($box['east'] ?? 0),
        ];
    }

    /**
     * @return list<string>
     */
    private function strings(mixed $value): array
    {
        return array_values(array_map(strval(...), is_array($value) ? $value : []));
    }

    /**
     * @return array{sections: int, paragraphs: int, places: int, exclusions: int, routes: int, milestones: int, events: array<string, int>}
     */
    private function counts(): array
    {
        $counts = (array) config('seerah.counts', []);
        $events = [];

        foreach ((array) ($counts['events'] ?? []) as $batch => $count) {
            $events[(string) $batch] = (int) $count;
        }

        return [
            'sections' => (int) ($counts['sections'] ?? 0),
            'paragraphs' => (int) ($counts['paragraphs'] ?? 0),
            'places' => (int) ($counts['places'] ?? 0),
            'exclusions' => (int) ($counts['exclusions'] ?? 0),
            'routes' => (int) ($counts['routes'] ?? 0),
            'milestones' => (int) ($counts['milestones'] ?? 0),
            'events' => $events,
        ];
    }
}
