<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

use App\Domains\Seerah\Canonical\CanonicalSection;
use App\Domains\Seerah\Dataset\Parsing\EventParser;
use App\Domains\Seerah\Dataset\Parsing\ExclusionParser;
use App\Domains\Seerah\Dataset\Parsing\GazetteerParser;
use App\Domains\Seerah\Dataset\Parsing\LayoutParser;
use App\Domains\Seerah\Dataset\Parsing\MilestoneParser;
use App\Domains\Seerah\Dataset\Parsing\RouteParser;
use App\Domains\Seerah\Dataset\Parsing\SignOffParser;
use App\Domains\Seerah\Dataset\Parsing\StructureParser;
use App\Domains\Seerah\Format\SeerahJson;
use App\Domains\Seerah\Validation\IssueBag;
use JsonException;

/**
 * Reads the Seerah data folder (data-format.md, Folder) into a SeerahDataset. Pure: it reads files only, never the database or
 * the network. A file that is missing, is not valid JSON or is not in the canonical format is an issue (V1 or V2) and is left out.
 */
final class SeerahDatasetLoader
{
    /**
     * @param  list<string>  $batches  the batch names, in order (config seerah.batches)
     */
    public function load(string $directory, array $batches, IssueBag $issues): SeerahDataset
    {
        $structure = $this->structure($directory, $issues);
        $gazetteer = $this->gazetteer($directory, $issues);

        $events = [];

        foreach ($batches as $batch) {
            $file = $this->read($directory.'/events/'.$batch.'.json', 'events/'.$batch.'.json', $issues);

            if ($file !== null) {
                $events[$batch] = (new EventParser)->parse($file, 'events/'.$batch.'.json', $batch, $issues);
            }
        }

        $routes = $this->parseFile($directory, 'routes.json', $issues, fn (array $data, string $where): array => (new RouteParser)->parse($data, $where, $issues));
        $milestones = $this->parseFile($directory, 'milestones.json', $issues, fn (array $data, string $where): array => (new MilestoneParser)->parse($data, $where, $issues));
        $exclusions = $this->parseFile($directory, 'exclusions.json', $issues, fn (array $data, string $where): array => (new ExclusionParser)->parse($data, $where, $issues));

        return new SeerahDataset(
            structureSourceSha256: $structure['source'] ?? null,
            structureCanonicalSha256: $structure['canonical'] ?? null,
            structure: $structure['sections'] ?? null,
            gazetteer: $gazetteer,
            events: $events,
            routes: $routes,
            milestones: $milestones,
            exclusions: $exclusions,
            layouts: $this->layouts($directory, $issues),
            signOffs: $this->signOffs($directory, $issues),
        );
    }

    /**
     * @return array{source: string, canonical: string, sections: list<CanonicalSection>}|null
     */
    private function structure(string $directory, IssueBag $issues): ?array
    {
        $data = $this->read($directory.'/book/structure.json', 'book/structure.json', $issues);

        return $data === null ? null : (new StructureParser)->parse($data, 'book/structure.json', $issues);
    }

    private function gazetteer(string $directory, IssueBag $issues): ?Gazetteer
    {
        $data = $this->read($directory.'/gazetteer.json', 'gazetteer.json', $issues);

        return $data === null ? null : (new GazetteerParser)->parse($data, 'gazetteer.json', $issues);
    }

    /**
     * @template T
     *
     * @param  callable(array<array-key, mixed>, string): T  $parse
     * @return T|array{}
     */
    private function parseFile(string $directory, string $name, IssueBag $issues, callable $parse): mixed
    {
        $data = $this->read($directory.'/'.$name, $name, $issues);

        return $data === null ? [] : $parse($data, $name);
    }

    /**
     * @return array<string, DrawnLayout>
     */
    private function layouts(string $directory, IssueBag $issues): array
    {
        $layouts = [];

        foreach (glob($directory.'/map/layout.*.json') ?: [] as $path) {
            $name = 'map/'.basename($path);
            $data = $this->read($path, $name, $issues);

            if ($data === null) {
                continue;
            }

            $layout = (new LayoutParser)->parse($data, $name, $issues);

            if ($layout !== null) {
                $layouts[$layout->level] = $layout;
            }
        }

        ksort($layouts);

        return $layouts;
    }

    /**
     * @return array<string, SignOff>
     */
    private function signOffs(string $directory, IssueBag $issues): array
    {
        $signOffs = [];

        foreach (glob($directory.'/reviews/*.json') ?: [] as $path) {
            $name = 'reviews/'.basename($path);
            $data = $this->read($path, $name, $issues);

            if ($data === null) {
                continue;
            }

            $signOff = (new SignOffParser)->parse($data, $name, $issues);
            $signOffs[$signOff->group] = $signOff;
        }

        ksort($signOffs);

        return $signOffs;
    }

    /**
     * Reads one JSON file as an array. A missing file is a V2 error here; a file that is not valid JSON or not canonical is too.
     *
     * @return array<array-key, mixed>|null
     */
    private function read(string $path, string $where, IssueBag $issues): ?array
    {
        if (! is_file($path)) {
            $issues->error('V2', $where, 'file is missing');

            return null;
        }

        $text = (string) file_get_contents($path);

        try {
            $data = json_decode($text, true, 512, JSON_THROW_ON_ERROR);
            $canonical = SeerahJson::canonicalText($text);
        } catch (JsonException) {
            $issues->error('V2', $where, 'file is not valid JSON');

            return null;
        }

        if ($canonical !== $text) {
            $issues->error('V2', $where, 'file is not in the canonical format (run seerah:fmt)');
        }

        return is_array($data) ? $data : null;
    }
}
