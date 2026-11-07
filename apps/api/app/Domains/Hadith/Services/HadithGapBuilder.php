<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Exceptions\HadithGapBuildException;
use App\Domains\Hadith\Overlay\GapDecision;
use App\Domains\Hadith\Overlay\GapDecisions;
use App\Domains\Hadith\Overlay\HadithDataFiles;
use App\Domains\Hadith\Overlay\HadithWordSet;
use App\Domains\Hadith\Overlay\OpenItiHeadingCleaner;
use App\Domains\Hadith\Overlay\OpenItiTextCleaner;
use App\Domains\Hadith\Overlay\OpenItiUnit;
use App\Domains\Hadith\Overlay\OpenItiUnitReader;
use App\Domains\Hadith\Sources\HadithSourceRegistry;
use App\Domains\Hadith\Sources\Records\SourceCollection;
use App\Domains\Hadith\Sources\Records\SourceHadith;
use App\Integrations\HadithApiCom\HadithApiComClient;
use App\Integrations\HadithApiCom\HadithApiComConfig;
use App\Integrations\HadithApiCom\HadithApiComConfigException;
use App\Integrations\HadithApiCom\HadithApiComException;
use App\Integrations\HadithApiCom\HadithApiComRecord;

/**
 * hadith:build-gaps (ADR 0076, step 6b.6). Applies the classification of the committed decisions file to the pinned OpenITI file
 * and the fawazahmed0 snapshot. It never re-classifies: each class has the re-checks of brief 8.5 and nothing more. A failed
 * re-check turns the number into an unresolved entry, never a fill. hadithapi.com is reached only when a decision needs it,
 * through the paced client and the dev-only key; a missing key lists those numbers as unresolved. Dev only.
 */
final class HadithGapBuilder
{
    private const float MATCH_THRESHOLD = 0.5;

    private const float CONTAINED_DEFAULT = 0.8;

    private const int NEIGHBOUR_WINDOW = 20;

    private const string GENERATOR = 'hadith:build-gaps 1';

    /** @var array<string, array<string, list<HadithApiComRecord>|null>> book slug => number => records (null: key missing) */
    private array $hapiCache = [];

    private ?HadithApiComClient $hapi = null;

    private bool $hapiKeyMissing = false;

    /** @var array<string, int> */
    private array $reasons = [];

    /** @var array<string, int> */
    private array $fillsByOrigin = [];

    /** @var array<string, int> */
    private array $mergesBySide = [];

    private int $residualMarkers = 0;

    private int $doubleSpaces = 0;

    private int $hapiTextWithMarkup = 0;

    public function __construct(
        private readonly HadithDataFiles $dataFiles,
        private readonly HadithSourceRegistry $sources,
        private readonly OpenItiUnitReader $units,
        private readonly OpenItiTextCleaner $textCleaner,
        private readonly OpenItiHeadingCleaner $headingCleaner,
    ) {}

    /**
     * @throws HadithGapBuildException when a pin, a count or an option does not match
     * @throws HadithDataFileException when the decisions file is malformed
     */
    public function build(string $slug, string $openitiDir, ?string $retrievedOn): GapBuildResult
    {
        $this->resetRun();
        $openiti = $this->openitiConfig($slug);
        $decisions = $this->dataFiles->decisions($slug);

        if (! $decisions instanceof GapDecisions) {
            throw new HadithGapBuildException('The decisions file of ['.$slug.'] is not committed and pinned (decisions_not_committed).');
        }

        $this->assertCommit($decisions);
        $decisionsSha = (string) $this->dataFiles->actualSha256('gaps/decisions/'.$slug.'.json');
        $openitiPath = rtrim($openitiDir, '/').'/'.basename((string) $openiti['path']);
        $bytes = is_file($openitiPath) ? file_get_contents($openitiPath) : false;

        if ($bytes === false) {
            throw new HadithGapBuildException('The OpenITI file of ['.$slug.'] is missing in the given folder (openiti_file_missing).');
        }

        $fileSha = hash('sha256', $bytes);

        if (! hash_equals((string) $openiti['sha256'], $fileSha) || $fileSha !== $decisions->openiti['sha256']) {
            throw new HadithGapBuildException('The OpenITI file of ['.$slug.'] differs from its pin or from the decisions file (openiti_sha_mismatch).');
        }

        $units = $this->units->units($openitiPath, (string) $openiti['unit_start'], (string) $openiti['unit_stop']);

        if (count($units) !== (int) $openiti['unit_count']) {
            throw new HadithGapBuildException('The unit count of ['.$slug.'] is '.count($units).', not the golden '.$openiti['unit_count'].' (unit_count_mismatch).');
        }

        $collection = $this->sources->primary()->collection($slug);
        $byNumber = [];
        $positions = [];

        foreach ($collection->hadiths as $index => $hadith) {
            $byNumber[$hadith->number] = $hadith;
            $positions[$hadith->number] = $index;
        }

        $primaryFile = basename((string) $openiti['path']);
        $unitsByFile = $this->unitsByFile($slug, $decisions, $openitiDir, $primaryFile, $units);
        $outcome = $this->classify($slug, $decisions, $unitsByFile, $primaryFile, $collection, $byNumber, $positions, $retrievedOn);
        $extraBooks = $this->extraBooks($slug, $bytes, $units, $openiti);

        return $this->proposal($slug, $decisions, $fileSha, $decisionsSha, $openiti, $outcome, $extraBooks, $retrievedOn, count($units));
    }

    /**
     * @param  array<string, list<OpenItiUnit>>  $unitsByFile  file basename => units, the primary file included
     * @param  array<string, SourceHadith>  $byNumber
     * @param  array<string, int>  $positions
     * @return array{fills: list<array<string, mixed>>, merges: list<array<string, mixed>>, unresolved: list<array<string, mixed>>, classes: array<string, int>}
     */
    private function classify(string $slug, GapDecisions $decisions, array $unitsByFile, string $primaryFile, SourceCollection $collection, array $byNumber, array $positions, ?string $retrievedOn): array
    {
        $fills = [];
        $merges = [];
        $unresolved = [];
        $classes = [];
        $seen = [];
        $runFailures = $this->runFailures($decisions, $unitsByFile, $primaryFile, $byNumber);

        foreach ($decisions->entries as $entry) {
            $classes[$entry->class] = ($classes[$entry->class] ?? 0) + 1;

            if (isset($seen[$entry->hadith])) {
                $this->unresolve($unresolved, $entry->hadith, 'recheck_duplicate');

                continue;
            }

            $seen[$entry->hadith] = true;

            if ($entry->class === 'unknown') {
                $this->unresolve($unresolved, $entry->hadith, $entry->reason === 'neighbour_not_confirmed' ? 'neighbour_not_confirmed' : 'unknown_after_measurement');

                continue;
            }

            if ($entry->class === 'fill-safe' && $entry->source === 'openiti') {
                $file = $this->fileOf($entry, $primaryFile);

                if (isset($runFailures[$this->runKey($entry, $primaryFile)])) {
                    $this->unresolve($unresolved, $entry->hadith, 'recheck_neighbour_failed');

                    continue;
                }

                $fill = $this->openitiFill($slug, $entry, $unitsByFile[$file], $byNumber, $file);

                if (is_string($fill)) {
                    $this->unresolve($unresolved, $entry->hadith, $fill);
                } else {
                    $fills[] = $fill;
                }

                continue;
            }

            if ($entry->class === 'fill-safe' && $entry->source === 'hadithapi.com') {
                $fill = $this->hapiFill($slug, $entry, $collection, $byNumber, $positions);

                if (is_string($fill)) {
                    $this->unresolve($unresolved, $entry->hadith, $fill);
                } else {
                    $fills[] = $fill;
                }

                continue;
            }

            if (in_array($entry->class, ['merge-prev', 'merge-next'], true) && in_array($entry->source, ['openiti', 'hadithapi.com'], true)) {
                $merge = $this->merge($slug, $entry, $byNumber);

                if (is_string($merge)) {
                    $this->unresolve($unresolved, $entry->hadith, $merge);
                } else {
                    $merges[] = $merge;
                }

                continue;
            }

            $this->unresolve($unresolved, $entry->hadith, 'unknown_after_measurement');
        }

        return ['fills' => $fills, 'merges' => $merges, 'unresolved' => $unresolved, 'classes' => $classes];
    }

    /**
     * For each run of OpenITI fill-safe entries, the unit before its first unit must match the first entry's prev, and the unit
     * after its last unit must match the last entry's next (ADR 0076 §8.5, check a). Returns the runs that fail.
     *
     * A run is checked in the units of its own file (a run never spans two files).
     *
     * @param  array<string, list<OpenItiUnit>>  $unitsByFile
     * @param  array<string, SourceHadith>  $byNumber
     * @return array<string, true>
     */
    private function runFailures(GapDecisions $decisions, array $unitsByFile, string $primaryFile, array $byNumber): array
    {
        $runs = [];

        foreach ($decisions->entries as $entry) {
            if ($entry->class === 'fill-safe' && $entry->source === 'openiti' && $entry->openitiUnit !== null) {
                $runs[$this->runKey($entry, $primaryFile)][] = $entry;
            }
        }

        $failures = [];

        foreach ($runs as $key => $entries) {
            usort($entries, static fn (GapDecision $a, GapDecision $b): int => (int) $a->openitiUnit <=> (int) $b->openitiUnit);
            $first = $entries[0];
            $last = $entries[array_key_last($entries)];
            $units = $unitsByFile[$this->fileOf($first, $primaryFile)];
            $before = $units[(int) $first->openitiUnit - 1] ?? null;
            $after = $units[(int) $last->openitiUnit + 1] ?? null;

            if (! $before instanceof OpenItiUnit || ! $after instanceof OpenItiUnit
                || ! $this->matches($this->unitWords($before), $first->prev, $byNumber)
                || ! $this->matches($this->unitWords($after), $last->next, $byNumber)) {
                $failures[$key] = true;
            }
        }

        return $failures;
    }

    /**
     * @param  list<OpenItiUnit>  $units  the units of the file the entry names ($file)
     * @param  array<string, SourceHadith>  $byNumber
     * @return array<string, mixed>|string a fill row, or the failing re-check code
     */
    private function openitiFill(string $slug, GapDecision $entry, array $units, array $byNumber, string $file): array|string
    {
        $unit = $units[(int) $entry->openitiUnit] ?? null;

        if (! $unit instanceof OpenItiUnit || $unit->number === null || (string) $unit->number !== $entry->openitiUnitNumber) {
            return 'unit_number_mismatch';
        }

        $text = $this->textCleaner->clean($unit->lines, $unit->markerEnd);

        if ($text === '') {
            return 'recheck_neighbour_failed';
        }

        $words = HadithWordSet::of($text);

        foreach ([$entry->prev, $entry->next] as $neighbour) {
            $neighbourText = $neighbour === null ? null : $byNumber[$neighbour]->text ?? null;

            if ($neighbourText === null || $neighbourText === '') {
                return 'recheck_neighbour_failed';
            }
        }

        foreach ([$entry->prev, $entry->next] as $neighbour) {
            if (HadithWordSet::containment($words, HadithWordSet::of((string) $byNumber[(string) $neighbour]->text)) >= self::CONTAINED_DEFAULT) {
                return 'recheck_duplicate';
            }
        }

        $this->countText($text);

        return $this->fillRow($slug, $entry->hadith, 'openiti', $text, $entry->openitiUnit, $file);
    }

    /**
     * @param  array<string, SourceHadith>  $byNumber
     * @param  array<string, int>  $positions
     * @return array<string, mixed>|string
     */
    private function hapiFill(string $slug, GapDecision $entry, SourceCollection $collection, array $byNumber, array $positions): array|string
    {
        if (! $this->isInteger($entry->hadith) || ! $this->isInteger($entry->prev) || ! $this->isInteger($entry->next)) {
            return 'neighbour_not_fetchable';
        }

        $gap = $this->hapiRecordFor($slug, $entry->hadith);

        if ($gap === null) {
            return 'hadithapi_key_missing';
        }

        if ($gap === []) {
            return 'recheck_hapi_failed';
        }

        $record = $gap[0];

        if (count($gap) !== 1 || count($record->numbers) !== 1) {
            return 'recheck_hapi_failed';
        }

        $recordWords = HadithWordSet::of($record->textAr);

        foreach ([$entry->prev, $entry->next] as $neighbour) {
            $neighbourRecords = $this->hapiRecordFor($slug, (string) $neighbour);

            if ($neighbourRecords === null || $neighbourRecords === [] || $this->neighbourText($byNumber, (string) $neighbour) === null) {
                return 'recheck_hapi_failed';
            }

            $neighbourText = (string) $this->neighbourText($byNumber, (string) $neighbour);

            if (HadithWordSet::jaccard(HadithWordSet::of((string) $neighbourRecords[0]->textAr), HadithWordSet::of($neighbourText)) < self::MATCH_THRESHOLD) {
                return 'recheck_hapi_failed';
            }

            if (HadithWordSet::containment($recordWords, HadithWordSet::of($neighbourText)) >= self::CONTAINED_DEFAULT) {
                return 'recheck_hapi_failed';
            }
        }

        $centre = $positions[(string) $entry->prev] ?? null;

        if ($centre !== null) {
            for ($index = max(0, $centre - self::NEIGHBOUR_WINDOW); $index <= min(count($collection->hadiths) - 1, $centre + self::NEIGHBOUR_WINDOW); $index++) {
                $text = $collection->hadiths[$index]->text;

                if ($text !== null && $text !== '' && HadithWordSet::jaccard($recordWords, HadithWordSet::of($text)) >= self::MATCH_THRESHOLD) {
                    return 'recheck_hapi_failed';
                }
            }
        }

        $this->countText($record->textAr);

        if (preg_match('~[<&]~', $record->textAr) === 1) {
            $this->hapiTextWithMarkup++;
        }

        return $this->fillRow($slug, $entry->hadith, 'hadithapicom', $record->textAr, null);
    }

    /**
     * @param  array<string, SourceHadith>  $byNumber
     * @return array<string, string>|string
     */
    private function merge(string $slug, GapDecision $entry, array $byNumber): array|string
    {
        $into = $entry->class === 'merge-prev' ? $entry->prev : $entry->next;

        if ($into === null || $this->neighbourText($byNumber, $into) === null) {
            return 'recheck_neighbour_failed';
        }

        $origin = $entry->source === 'openiti' ? 'openiti' : 'hadithapicom';

        if ($origin === 'hadithapicom') {
            $records = $this->isInteger($entry->hadith) ? $this->hapiRecordFor($slug, $entry->hadith) : [];

            if ($records === null) {
                return 'hadithapi_key_missing';
            }

            if ($records === [] || $this->isInteger($into) === false) {
                return 'recheck_hapi_failed';
            }

            $lists = in_array($into, $records[0]->numbers, true);
            $contained = HadithWordSet::containment(HadithWordSet::of($records[0]->textAr), HadithWordSet::of((string) $this->neighbourText($byNumber, $into))) >= self::CONTAINED_DEFAULT;

            if (! $lists && ! $contained) {
                return 'recheck_hapi_failed';
            }
        }

        $this->mergesBySide[$entry->class] = ($this->mergesBySide[$entry->class] ?? 0) + 1;

        return ['number' => $entry->hadith, 'into' => $into, 'origin' => $origin];
    }

    /**
     * The records of a number, from the paced client and the cache; null when the key is missing.
     *
     * @return list<HadithApiComRecord>|null
     */
    private function hapiRecordFor(string $slug, string $number): ?array
    {
        $book = (string) (config('hadith.title_match.books.'.$slug) ?? '');

        if (isset($this->hapiCache[$book][$number])) {
            return $this->hapiCache[$book][$number];
        }

        $client = $this->hapiClient();

        if ($client === null) {
            return null;
        }

        try {
            $records = $client->recordsForNumber($book, (int) $number);
        } catch (HadithApiComException) {
            $records = [];
        }

        $this->hapiCache[$book][$number] = $records;

        return $records;
    }

    private function hapiClient(): ?HadithApiComClient
    {
        if ($this->hapiKeyMissing) {
            return null;
        }

        if ($this->hapi instanceof HadithApiComClient) {
            return $this->hapi;
        }

        try {
            $this->hapi = new HadithApiComClient(HadithApiComConfig::fromConfig());
        } catch (HadithApiComConfigException) {
            $this->hapiKeyMissing = true;

            return null;
        }

        return $this->hapi;
    }

    /**
     * @return array<string, mixed>
     */
    private function fillRow(string $slug, string $number, string $origin, string $text, ?int $unit, ?string $openitiFile = null): array
    {
        $row = [
            'number' => $number,
            'origin' => $origin,
            'source_key' => $origin.':'.$slug.':'.$number,
        ];

        if ($unit !== null) {
            $row['unit'] = $unit;
        }

        if ($openitiFile !== null) {
            $row['openiti_file'] = $openitiFile;
        }

        $row['text_ar'] = $text;
        $row['source_text_sha256'] = hash('sha256', $text);
        $this->fillsByOrigin[$origin] = ($this->fillsByOrigin[$origin] ?? 0) + 1;

        return $row;
    }

    /**
     * Counts the markers a cleaned text still carries and its double spaces. Counts only: the text is never changed here.
     */
    private function countText(string $text): void
    {
        if (preg_match('%[#~|$]|PageV%', $text) === 1) {
            $this->residualMarkers++;
        }

        if (str_contains($text, '  ')) {
            $this->doubleSpaces++;
        }
    }

    /**
     * @return array<string, true>
     */
    private function unitWords(OpenItiUnit $unit): array
    {
        return HadithWordSet::of($this->textCleaner->clean($unit->lines, $unit->markerEnd));
    }

    /**
     * @param  array<string, true>  $words
     * @param  array<string, SourceHadith>  $byNumber
     */
    private function matches(array $words, ?string $number, array $byNumber): bool
    {
        $text = $number === null ? null : $this->neighbourText($byNumber, $number);

        return $text !== null && HadithWordSet::jaccard($words, HadithWordSet::of($text)) >= self::MATCH_THRESHOLD;
    }

    /**
     * @param  array<string, SourceHadith>  $byNumber
     */
    private function neighbourText(array $byNumber, string $number): ?string
    {
        $text = $byNumber[$number]->text ?? null;

        return $text === null || $text === '' ? null : $text;
    }

    /**
     * @param  list<array<string, mixed>>  $unresolved
     */
    private function unresolve(array &$unresolved, string $number, string $reason): void
    {
        $unresolved[] = ['number' => $number, 'reason' => $reason];
        $this->reasons[$reason] = ($this->reasons[$reason] ?? 0) + 1;
    }

    private function isInteger(?string $number): bool
    {
        return $number !== null && preg_match('~^[0-9]+$~', $number) === 1;
    }

    private function resetRun(): void
    {
        $this->hapiCache = [];
        $this->hapi = null;
        $this->hapiKeyMissing = false;
        $this->reasons = [];
        $this->fillsByOrigin = [];
        $this->mergesBySide = [];
        $this->residualMarkers = 0;
        $this->doubleSpaces = 0;
        $this->hapiTextWithMarkup = 0;
    }

    /**
     * The units of every OpenITI file a fill-safe OpenITI decision names, keyed by file basename. The primary file is always
     * present. An alternate is loaded only for such a decision, so a merge or an unknown entry never forces its pin.
     *
     * @param  list<OpenItiUnit>  $primaryUnits
     * @return array<string, list<OpenItiUnit>>
     *
     * @throws HadithGapBuildException
     */
    private function unitsByFile(string $slug, GapDecisions $decisions, string $openitiDir, string $primaryFile, array $primaryUnits): array
    {
        $unitsByFile = [$primaryFile => $primaryUnits];

        foreach ($decisions->entries as $entry) {
            if ($entry->class !== 'fill-safe' || $entry->source !== 'openiti' || $entry->openitiFile === null || isset($unitsByFile[$entry->openitiFile])) {
                continue;
            }

            $unitsByFile[$entry->openitiFile] = $this->alternateUnits($slug, $entry->openitiFile, $openitiDir);
        }

        return $unitsByFile;
    }

    /**
     * The units of an alternate OpenITI file, after its SHA-256 check against config (ADR 0076, step 6b.6 alternates).
     *
     * @return list<OpenItiUnit>
     *
     * @throws HadithGapBuildException
     */
    private function alternateUnits(string $slug, string $file, string $openitiDir): array
    {
        $alternate = $this->alternateConfig($slug, $file);
        $sha = $alternate['sha256'];
        $path = rtrim($openitiDir, '/').'/'.$file;
        $bytes = is_file($path) ? file_get_contents($path) : false;

        if ($bytes === false) {
            throw new HadithGapBuildException('The alternate OpenITI file ['.$file.'] of ['.$slug.'] is missing in the given folder (openiti_file_missing).');
        }

        if (! hash_equals($sha, hash('sha256', $bytes))) {
            throw new HadithGapBuildException('The alternate OpenITI file ['.$file.'] of ['.$slug.'] differs from its pin in config (openiti_alternate_sha_mismatch).');
        }

        $units = $this->units->units($path, $alternate['unit_start'], $alternate['unit_stop']);

        if (isset($alternate['unit_count']) && count($units) !== $alternate['unit_count']) {
            throw new HadithGapBuildException('The unit count of the alternate ['.$file.'] is '.count($units).', not the config '.$alternate['unit_count'].' (unit_count_mismatch).');
        }

        return $units;
    }

    /**
     * The config entry of an alternate file, refused when it is missing or has no SHA-256 pin.
     *
     * @return array{path: string, sha256: string, unit_start: string, unit_stop: string, unit_count?: int}
     *
     * @throws HadithGapBuildException
     */
    private function alternateConfig(string $slug, string $file): array
    {
        $alternates = $this->openitiConfig($slug)['alternates'] ?? [];

        foreach (is_array($alternates) ? $alternates : [] as $alternate) {
            if (! is_array($alternate) || ! is_string($alternate['path'] ?? null) || basename($alternate['path']) !== $file) {
                continue;
            }

            if (! is_string($alternate['unit_start'] ?? null) || ! is_string($alternate['unit_stop'] ?? null)) {
                throw new HadithGapBuildException('Config [hadith.openiti.files] holds an alternate of ['.$slug.'] without unit patterns (openiti_config_missing).');
            }

            if (! is_string($alternate['sha256'] ?? null) || preg_match('~^[0-9a-f]{64}$~', $alternate['sha256']) !== 1) {
                throw new HadithGapBuildException('The alternate OpenITI file ['.$file.'] of ['.$slug.'] has no SHA-256 pin in config (openiti_alternate_unpinned).');
            }

            return $alternate;
        }

        throw new HadithGapBuildException('The OpenITI file ['.$file.'] named by a decision of ['.$slug.'] is not an alternate in config (openiti_alternate_unknown).');
    }

    /**
     * The alternate files a proposal's fills came from, with the pins of config, sorted by path. The primary file is not listed:
     * it is the origin's own file.
     *
     * @param  list<array<string, mixed>>  $fills
     * @return list<array{file: string, file_sha256: string}>
     *
     * @throws HadithGapBuildException
     */
    private function alternateFiles(string $slug, array $fills, string $primaryFile): array
    {
        $files = [];

        foreach ($fills as $fill) {
            $file = $fill['openiti_file'] ?? null;

            if (! is_string($file) || $file === $primaryFile || isset($files[$file])) {
                continue;
            }

            $alternate = $this->alternateConfig($slug, $file);
            $files[$file] = ['file' => $alternate['path'], 'file_sha256' => $alternate['sha256']];
        }

        ksort($files);

        return array_values($files);
    }

    private function fileOf(GapDecision $entry, string $primaryFile): string
    {
        return $entry->openitiFile ?? $primaryFile;
    }

    private function runKey(GapDecision $entry, string $primaryFile): string
    {
        return $this->fileOf($entry, $primaryFile).'|'.($entry->runFirst ?? '').'|'.($entry->runLast ?? '');
    }

    /**
     * @return array<string, mixed>
     *
     * @throws HadithGapBuildException
     */
    private function openitiConfig(string $slug): array
    {
        $files = config('hadith.openiti.files');
        $entry = is_array($files) ? ($files[$slug] ?? null) : null;

        if (! is_array($entry) || ! is_string($entry['path'] ?? null) || ! is_string($entry['sha256'] ?? null) || ! is_string($entry['unit_start'] ?? null) || ! is_string($entry['unit_stop'] ?? null) || ! is_int($entry['unit_count'] ?? null)) {
            throw new HadithGapBuildException('Config [hadith.openiti.files] has no complete entry for ['.$slug.'] (openiti_config_missing).');
        }

        return $entry;
    }

    /**
     * @throws HadithGapBuildException
     */
    private function assertCommit(GapDecisions $decisions): void
    {
        if ($decisions->fawazahmed0Commit !== (string) config('hadith.commit')) {
            throw new HadithGapBuildException('The decisions file is not for the pinned fawazahmed0 commit (commit_mismatch).');
        }
    }

    /**
     * The extra books of config hadith.extra_books (ADR 0076 decision 4, brief 8.5): the n-th book heading of the OpenITI file,
     * checked by the 95% two-way rule with integer math. A book whose number is undecided is written as null and reported.
     *
     * @param  list<OpenItiUnit>  $units
     * @param  array<string, mixed>  $openiti
     * @return array{books: list<array<string, mixed>>, report: list<array<string, mixed>>}
     *
     * @throws HadithGapBuildException
     */
    private function extraBooks(string $slug, string $bytes, array $units, array $openiti): array
    {
        $configured = config('hadith.extra_books.'.$slug, []);

        if (! is_array($configured) || $configured === []) {
            return ['books' => [], 'report' => []];
        }

        $lines = $this->units->bodyLines($bytes);
        $headings = $this->bookHeadings($lines);
        $books = [];
        $report = [];

        foreach ($configured as $entry) {
            if (! is_array($entry)) {
                throw new HadithGapBuildException('Config [hadith.extra_books] for ['.$slug.'] holds a book that is not valid.');
            }

            $ordinal = (int) ($entry['openiti_heading_ordinal'] ?? 0);
            $heading = $headings[$ordinal - 1] ?? null;

            if ($ordinal < 1 || $heading === null) {
                throw new HadithGapBuildException('The book heading '.$ordinal.' of ['.$slug.'] is not in the OpenITI file (book_heading_missing).');
            }

            $end = $headings[$ordinal]['index'] ?? PHP_INT_MAX;
            $bookUnits = array_values(array_filter($units, static fn (OpenItiUnit $unit): bool => $unit->lineIndex > $heading['index'] && $unit->lineIndex < $end));
            $first = (int) $entry['first'];
            $last = (int) $entry['last'];
            $span = $last - $first + 1;
            $unitNumbers = [];

            foreach ($bookUnits as $unit) {
                if ($unit->number !== null) {
                    $unitNumbers[$unit->number] = true;
                }
            }

            $forward = 0;

            for ($number = $first; $number <= $last; $number++) {
                if (isset($unitNumbers[$number])) {
                    $forward++;
                }
            }

            $backward = count(array_filter($bookUnits, static fn (OpenItiUnit $unit): bool => $unit->number !== null && $unit->number >= $first && $unit->number <= $last));
            $forwardRequired = intdiv(95 * $span + 99, 100);
            $backwardRequired = intdiv(95 * count($bookUnits) + 99, 100);

            if ($forward < $forwardRequired || $backward < $backwardRequired || $heading['title'] === '') {
                throw new HadithGapBuildException('The book heading '.$ordinal.' of ['.$slug.'] fails the two-way 95% rule (book_two_way_failed).');
            }

            $books[] = [
                'book_number' => $entry['book_number'] ?? null,
                'after_book' => (string) $entry['after_book'],
                'first' => (string) $entry['first'],
                'last' => (string) $entry['last'],
                'title_ar' => $heading['title'],
                'origin' => 'openiti',
                'source_key' => 'openiti:'.$slug.':book:'.$ordinal,
            ];
            $report[] = [
                'ordinal' => $ordinal,
                'forward' => $forward,
                'forward_required' => $forwardRequired,
                'backward' => $backward,
                'backward_required' => $backwardRequired,
                'book_number_undecided' => ($entry['book_number'] ?? null) === null,
            ];
        }

        return ['books' => $books, 'report' => $report];
    }

    /**
     * The book headings of the file (a line starting ### and one to three pipes, whose cleaned title starts with كتاب or أبواب).
     *
     * @param  list<string>  $lines
     * @return list<array{index: int, title: string}>
     */
    private function bookHeadings(array $lines): array
    {
        $headings = [];

        foreach ($lines as $index => $line) {
            if (preg_match('~^### \|{1,3} ?~u', $line) !== 1) {
                continue;
            }

            $continuation = [];

            for ($next = $index + 1; isset($lines[$next]) && str_starts_with($lines[$next], '~~'); $next++) {
                $continuation[] = $lines[$next];
            }

            $title = $this->headingCleaner->clean([$line, ...$continuation])->title;
            $title = (string) preg_replace('~^[0-9]+\s*-\s*~u', '', $title);

            if (preg_match('~^(كتاب|أبواب)(\s|$)~u', $title) === 1) {
                $headings[] = ['index' => $index, 'title' => $title];
            }
        }

        return $headings;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function sortByNumber(array $rows): array
    {
        usort($rows, static fn (array $first, array $second): int => ((float) $first['number'] <=> (float) $second['number']) ?: strcmp((string) $first['number'], (string) $second['number']));

        return $rows;
    }

    /**
     * @param  array{fills: list<array<string, mixed>>, merges: list<array<string, string>>, unresolved: list<array<string, string>>, classes: array<string, int>}  $outcome
     * @param  array{books: list<array<string, mixed>>, report: list<array<string, mixed>>}  $extraBooks
     * @param  array<string, mixed>  $openiti
     *
     * @throws HadithGapBuildException
     */
    private function proposal(string $slug, GapDecisions $decisions, string $fileSha, string $decisionsSha, array $openiti, array $outcome, array $extraBooks, ?string $retrievedOn, int $unitCount): GapBuildResult
    {
        $fills = $this->sortByNumber($outcome['fills']);
        $merges = $this->sortByNumber($outcome['merges']);
        $unresolved = $this->sortByNumber($outcome['unresolved']);
        $hapiUsed = $this->fillsOrMergesUse('hadithapicom', $fills, $merges);
        $openitiUsed = $this->fillsOrMergesUse('openiti', $fills, $merges) || $extraBooks['books'] !== [];

        if ($hapiUsed && ($retrievedOn === null || preg_match('~^[0-9]{4}-[0-9]{2}-[0-9]{2}$~', $retrievedOn) !== 1)) {
            throw new HadithGapBuildException('--retrieved-on=YYYY-MM-DD is required when a hadithapi.com row is written (retrieved_on_required).');
        }

        $origins = [];

        if ($openitiUsed) {
            $origins['openiti'] = [
                'source_version' => $slug === 'tirmidhi' ? 'github:'.(string) config('hadith.openiti.tirmidhi_repository').'@'.(string) config('hadith.openiti.tirmidhi_commit') : (string) config('hadith.openiti.release'),
                'doi' => (string) config('hadith.openiti.doi'),
                'file' => (string) $openiti['path'],
                'file_sha256' => $fileSha,
            ];
            $alternateFiles = $this->alternateFiles($slug, $fills, basename((string) $openiti['path']));

            if ($alternateFiles !== []) {
                $origins['openiti']['alternate_files'] = $alternateFiles;
            }
        }

        if ($hapiUsed) {
            $origins['hadithapicom'] = [
                'source_version' => 'retrieved-'.$retrievedOn,
                'book_slug' => (string) (config('hadith.title_match.books.'.$slug) ?? ''),
            ];
        }

        $document = [
            'schema_version' => 1,
            'collection' => $slug,
            'generator' => self::GENERATOR,
            'fawazahmed0_commit' => (string) config('hadith.commit'),
            'decisions_sha256' => $decisionsSha,
            'origins' => $origins === [] ? new \stdClass : $origins,
            'books' => $extraBooks['books'],
            'fills' => $fills,
            'merges' => $merges,
            'unresolved' => $unresolved,
        ];

        $json = json_encode($document, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n";

        return new GapBuildResult($json, [
            'collection' => $slug,
            'generator' => self::GENERATOR,
            'decisions_sha256' => $decisionsSha,
            'openiti_file_sha256' => $fileSha,
            'retrieved_on' => $retrievedOn,
            'openiti_units' => ['counted' => $unitCount, 'golden' => (int) $openiti['unit_count']],
            'entries' => count($decisions->entries),
            'classes' => $outcome['classes'],
            'fills' => ['total' => count($fills), 'by_origin' => $this->fillsByOrigin],
            'merges' => ['total' => count($merges), 'by_side' => $this->mergesBySide],
            'unresolved' => ['total' => count($unresolved), 'by_reason' => $this->reasons, 'numbers' => array_column($unresolved, 'number')],
            'extra_books' => $extraBooks['report'],
            'residual_markers' => $this->residualMarkers,
            'double_spaces' => $this->doubleSpaces,
            'hapi_text_with_markup' => $this->hapiTextWithMarkup,
            'proposal_sha256' => hash('sha256', $json),
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $fills
     * @param  list<array<string, mixed>>  $merges
     */
    private function fillsOrMergesUse(string $origin, array $fills, array $merges): bool
    {
        foreach ([...$fills, ...$merges] as $row) {
            if (($row['origin'] ?? null) === $origin) {
                return true;
            }
        }

        return false;
    }
}
