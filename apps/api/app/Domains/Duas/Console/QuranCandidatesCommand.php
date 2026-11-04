<?php

declare(strict_types=1);

namespace App\Domains\Duas\Console;

use App\Domains\Duas\Services\QuranDuaCandidateFinder;
use App\Domains\Duas\Services\QuranDuaMapWriter;
use App\Support\QuranText\SearchTextNormalizer;
use App\Support\QuranText\TanzilReader;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Matches Quranic duas against Tanzil simple text and writes candidate rows
 * to config/duas_quran_map.php (ADR 0044-duas §2). The file holds verse references and status only,
 * never text. Rows marked reviewed, rejected, or added are preserved.
 */
final class QuranCandidatesCommand extends Command
{
    protected $signature = 'duas:quran-candidates
        {--path= : Path to Tanzil simple text file (default packages/quran-text-check/data/tanzil-quran-simple-1.1.txt)}
        {--output= : Where to write the map (default config/duas_quran_map.php)}';

    protected $description = 'Match Quranic duas against Tanzil text and write candidate rows (ADR 0044-duas §2).';

    public function handle(
        QuranDuaCandidateFinder $finder,
        QuranDuaMapWriter $writer,
        SearchTextNormalizer $normalizer,
    ): int {
        $path = $this->option('path');
        $path = is_string($path) && $path !== ''
            ? $path
            : TanzilReader::simplePath();

        if (! is_file($path)) {
            $this->error("Unable to read Tanzil text at [{$path}].");

            return self::FAILURE;
        }

        try {
            $content = file_get_contents($path);
            if ($content === false) {
                throw new \RuntimeException("Unable to read file [{$path}].");
            }

            // Parse Tanzil format (surah|ayah|text) to build a surah:ayah => text map
            $verseMap = [];
            foreach (explode("\n", $content) as $line) {
                // Skip blank lines and comments (allow surah separators as blank lines)
                $trimmed = trim($line);
                if ($trimmed === '' || str_starts_with($trimmed, '#')) {
                    continue;
                }

                $first = strpos($line, '|');
                $second = $first === false ? false : strpos($line, '|', $first + 1);

                if ($first === false || $first === 0 || $second === false || $second <= $first + 1) {
                    throw new \RuntimeException("A Tanzil line does not have sura, ayah and text separators: [{$line}]");
                }

                $surah = substr($line, 0, $first);
                $ayah = substr($line, $first + 1, $second - $first - 1);

                if (preg_match('/^[0-9]+$/', $surah) !== 1 || preg_match('/^[0-9]+$/', $ayah) !== 1) {
                    throw new \RuntimeException("A Tanzil line does not have numeric sura and ayah numbers: [{$line}]");
                }

                $text = substr($line, $second + 1);
                $verseMap["quran:{$surah}:{$ayah}"] = $text;
            }
        } catch (\Exception $e) {
            $this->error('Tanzil read error: '.$e->getMessage());

            return self::FAILURE;
        }

        $output = $this->option('output');
        $output = is_string($output) && $output !== ''
            ? $output
            : config_path('duas_quran_map.php');

        $existing = is_file($output) ? (array) require $output : [];

        $result = $finder->findCandidates($verseMap, $existing, $normalizer);

        $writer->write($output, $result['rows']);

        $this->printSummary($result['stats'], $result['rows']);

        return self::SUCCESS;
    }

    /**
     * @param  array<string, int>  $stats
     * @param  array<string, list<array<array-key, mixed>>>  $rows
     */
    private function printSummary(array $stats, array $rows): void
    {
        $this->info('Matching results by rule:');
        $this->table(['Rule', 'Count'], [
            ['Rule 1: Vocative (begins with rabb/rab)', $stats['rule_vocative_rabb'] ?? 0],
            ['Rule 2: Speech verb + vocative', $stats['rule_speech_verb'] ?? 0],
            ['Rule 3: Contains Allahumma', $stats['rule_contains_allahumma'] ?? 0],
            ['Rule 4: Vocative near imperative', $stats['rule_imperative_list'] ?? 0],
        ]);

        $this->line('');
        $this->info('Summary:');
        $this->line('Total candidates: '.($stats['total_candidates'] ?? 0));
        $this->line('Reviewed/rejected/added rows preserved: '.($stats['preserved'] ?? 0));
    }
}
