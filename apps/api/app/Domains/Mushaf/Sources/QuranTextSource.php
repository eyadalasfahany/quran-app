<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Sources;

use App\Domains\Mushaf\Exceptions\SvgMushafSourceException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use JsonException;

/**
 * The pinned quran-ws/quran-text per-word muṣḥaf files (ADR 0090). Each file is checked against its git blob SHA-1 and size
 * (check A1) before use, and cached like the quran-svg files. Only the word's keys, page, line and the letter count of its
 * imlāʾī spelling are read; no text is kept, logged or returned.
 *
 * @phpstan-type QuranTextWord array{surah: int, ayah: int, position: int, letters: int|null, bodies: int}
 */
final class QuranTextSource
{
    private const string FOLDER = 'data/mushaf';

    private const array COLUMNS = ['surah', 'ayah', 'position_in_ayah', 'page', 'line', 'rasm_imlai', 'text'];

    /** Letters that never join the letter after them, so the next letter starts a new body (ADR 0090, word-box split). */
    private const string NON_JOINING = 'اأإآٱدذرزوؤةء';

    /** A body that is a lone hamza is mark-sized, never full height. */
    private const string LONE_HAMZA = 'ء';

    private const int TIMEOUT_SECONDS = 60;

    private const int CONNECT_TIMEOUT_SECONDS = 10;

    /** @var array<string, mixed>|null */
    private ?array $manifest = null;

    /**
     * The edition's numbered words, page => line => words in file order. Unnumbered words (ayah 0, the basmala some riwayat
     * print without a number) are left out.
     *
     * @return array<int, array<int, list<QuranTextWord>>>
     *
     * @throws SvgMushafSourceException
     */
    public function words(string $key, bool $offline): array
    {
        $csv = gzdecode($this->bytes($key.'.csv.gz', $offline));

        if ($csv === false) {
            throw new SvgMushafSourceException('The quran-text file for ['.$key.'] is not gzip.');
        }

        $stream = fopen('php://memory', 'r+');

        if ($stream === false) {
            throw new SvgMushafSourceException('The quran-text file for ['.$key.'] could not be read.');
        }

        fwrite($stream, $csv);
        unset($csv);
        rewind($stream);

        $header = fgetcsv($stream, null, ',', '"', '');
        $index = is_array($header) ? array_flip(array_map(fn (?string $name): string => (string) $name, $header)) : [];

        foreach (self::COLUMNS as $column) {
            if (! isset($index[$column])) {
                fclose($stream);

                throw new SvgMushafSourceException('The quran-text file for ['.$key.'] has no ['.$column.'] column.');
            }
        }

        $words = [];
        $row = 1;

        while (($fields = fgetcsv($stream, null, ',', '"', '')) !== false) {
            $row++;

            if ($fields === [null]) {
                continue;
            }

            $numbers = [];

            foreach (['surah', 'ayah', 'position_in_ayah', 'page', 'line'] as $column) {
                $value = (string) ($fields[$index[$column]] ?? '');

                if (! ctype_digit($value)) {
                    fclose($stream);

                    throw new SvgMushafSourceException('Row '.$row.' of the quran-text file for ['.$key.'] has a malformed ['.$column.'].');
                }

                $numbers[$column] = (int) $value;
            }

            if ($numbers['ayah'] === 0) {
                continue;
            }

            $letters = preg_match_all('/\p{L}/u', (string) ($fields[$index['rasm_imlai']] ?? ''));
            $words[$numbers['page']][$numbers['line']][] = [
                'surah' => $numbers['surah'],
                'ayah' => $numbers['ayah'],
                'position' => $numbers['position_in_ayah'],
                'letters' => is_int($letters) && $letters > 0 ? $letters : null,
                'bodies' => self::bodies((string) ($fields[$index['text']] ?? '')),
            ];
        }

        fclose($stream);

        return $words;
    }

    /**
     * How many separate letter bodies the printed word has: a body starts at the first letter and after every letter that does not
     * join the next one. Marks (combining characters and small letters) are not letters here. A lone hamza is left out, as it is
     * mark-sized. Only the count is kept; the text itself is not.
     */
    public static function bodies(string $text): int
    {
        preg_match_all('/\p{Lo}/u', $text, $matches);
        $bodies = 0;
        $start = true;

        foreach ($matches[0] as $letter) {
            if ($start && $letter !== self::LONE_HAMZA) {
                $bodies++;
            }

            $start = str_contains(self::NON_JOINING, $letter);
        }

        return $bodies;
    }

    /**
     * @throws SvgMushafSourceException
     */
    private function bytes(string $file, bool $offline): string
    {
        $relative = self::FOLDER.'/'.$file;
        $pin = $this->manifest()['files'][$relative] ?? null;

        if (! is_array($pin) || count($pin) !== 2 || ! is_string($pin[0]) || ! is_int($pin[1])) {
            throw new SvgMushafSourceException('The quran-text file ['.$relative.'] is not in the manifest.');
        }

        $store = new SvgMushafStore('quran-text/'.(string) config('mushaf.quran_text.commit'));

        if ($store->has(self::FOLDER, $file)) {
            $cached = $store->read(self::FOLDER, $file);

            if (self::passes($pin, $cached)) {
                return $cached;
            }

            $store->delete(self::FOLDER, $file);
        }

        if ($offline) {
            throw new SvgMushafSourceException('No verified cached copy of ['.$relative.'].');
        }

        $url = (string) config('mushaf.quran_text.raw_base').'/'.(string) config('mushaf.quran_text.commit').'/'.$relative;

        try {
            $response = Http::withUserAgent('Taybah/1.0')->timeout(self::TIMEOUT_SECONDS)->connectTimeout(self::CONNECT_TIMEOUT_SECONDS)->get($url);
        } catch (ConnectionException) {
            throw new SvgMushafSourceException('The quran-text source could not be reached for ['.$relative.'].');
        }

        if ($response->status() !== 200 || ! self::passes($pin, $response->body())) {
            throw new SvgMushafSourceException('The downloaded ['.$relative.'] does not match its pinned size and blob SHA.');
        }

        $store->write(self::FOLDER, $file, $response->body());

        return $response->body();
    }

    /**
     * @param  array{0: string, 1: int}  $pin
     */
    private static function passes(array $pin, string $bytes): bool
    {
        return strlen($bytes) === $pin[1] && hash_equals($pin[0], SvgMushafDownloader::blobSha($bytes));
    }

    /**
     * @return array<string, mixed>
     *
     * @throws SvgMushafSourceException
     */
    private function manifest(): array
    {
        if ($this->manifest !== null) {
            return $this->manifest;
        }

        $path = resource_path((string) config('mushaf.quran_text.manifest'));

        try {
            $decoded = is_file($path) ? json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR) : null;
        } catch (JsonException) {
            $decoded = null;
        }

        if (! is_array($decoded) || ($decoded['commit'] ?? null) !== config('mushaf.quran_text.commit') || ! is_array($decoded['files'] ?? null)) {
            throw new SvgMushafSourceException('The pinned quran-text manifest is missing or does not match config/mushaf.php.');
        }

        return $this->manifest = $decoded;
    }
}
