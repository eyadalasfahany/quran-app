<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

use App\Domains\Hadith\Exceptions\HadithDataFileException;

/**
 * The only reader of the committed Hadith data files (ADR 0076 §2, step 6b). Read-only: it never writes. A file is read only
 * when its SHA-256 matches the pin in config('hadith.data_files'), and the hash is checked before anything is parsed.
 */
final class HadithDataFiles
{
    private const string PATH_PATTERN = '~^(chapters|gaps|gaps/decisions)/[a-z0-9]+\.json$~';

    private const string PIN_PATTERN = '~^[0-9a-f]{64}$~';

    /**
     * ADR 0076 gap report, section 8.5: the closed set of unresolved reason codes.
     */
    private const array UNRESOLVED_REASONS = [
        'unknown_after_measurement',
        'neighbour_not_confirmed',
        'recheck_neighbour_failed',
        'recheck_duplicate',
        'unit_number_mismatch',
        'neighbour_not_fetchable',
        'recheck_hapi_failed',
    ];

    public function __construct(private readonly ?string $baseDirectory = null) {}

    /**
     * The verified bytes of a data file, or null when there is neither a file nor a pin.
     *
     * @throws HadithDataFileException with a code in the message: bad_path, pin_missing, file_missing, pin_malformed, sha_mismatch
     */
    public function readVerified(string $relativePath): ?string
    {
        $path = $this->absolutePath($relativePath);
        $pin = $this->pin($relativePath);
        $exists = is_file($path);

        if ($pin === null) {
            if ($exists) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] exists but has no pin (pin_missing).');
            }

            return null;
        }

        if (preg_match(self::PIN_PATTERN, $pin) !== 1) {
            throw new HadithDataFileException('Pin of data file ['.$relativePath.'] is not a lowercase SHA-256 (pin_malformed).');
        }

        if (! $exists) {
            throw new HadithDataFileException('Pinned data file ['.$relativePath.'] is missing (file_missing).');
        }

        $bytes = file_get_contents($path);

        if ($bytes === false) {
            throw new HadithDataFileException('Data file ['.$relativePath.'] cannot be read (file_missing).');
        }

        if (! hash_equals($pin, hash('sha256', $bytes))) {
            throw new HadithDataFileException('Data file ['.$relativePath.'] differs from its pin (sha_mismatch).');
        }

        return $bytes;
    }

    /**
     * The validated gaps file of a collection, or null when there is neither a file nor a pin (ADR 0076, step 6b.3).
     * Checks the shape and the values the file alone can decide; the edition checks are in HadithOverlayBuilder.
     *
     * @throws HadithDataFileException with a code: bad_json, unknown_key, missing_key, schema_version, collection_mismatch,
     *                                 commit_mismatch, origin_unknown, merge_invalid, fill_invalid, fill_key_invalid,
     *                                 fill_text_invalid, fill_hash_mismatch, book_invalid, reason_unknown, number_repeated
     */
    public function gaps(string $slug): ?GapFile
    {
        $relativePath = 'gaps/'.$slug.'.json';
        $bytes = $this->readVerified($relativePath);

        if ($bytes === null) {
            return null;
        }

        $data = $this->decode($bytes, $relativePath);
        $this->assertKeys($data, ['schema_version', 'collection', 'generator', 'fawazahmed0_commit', 'decisions_sha256', 'origins', 'books', 'fills', 'merges', 'unresolved'], $relativePath);

        if (($data['schema_version'] ?? null) !== 1) {
            throw new HadithDataFileException('Data file ['.$relativePath.'] has an unsupported schema_version (schema_version).');
        }

        if (($data['collection'] ?? null) !== $slug) {
            throw new HadithDataFileException('Data file ['.$relativePath.'] names another collection (collection_mismatch).');
        }

        if (($data['fawazahmed0_commit'] ?? null) !== config('hadith.commit')) {
            throw new HadithDataFileException('Data file ['.$relativePath.'] is not pinned to the fawazahmed0 commit (commit_mismatch).');
        }

        $origins = $this->origins($data['origins'] ?? null, $relativePath);
        $merges = $this->merges($data['merges'] ?? null, $origins, $relativePath);
        $fills = $this->fills($data['fills'] ?? null, $origins, $slug, $relativePath);
        $books = $this->books($data['books'] ?? null, $origins, $relativePath);
        $unresolved = $this->unresolved($data['unresolved'] ?? null, $relativePath);
        $this->assertNoRepeatedNumbers($merges, $fills, $unresolved, $relativePath);

        return new GapFile(
            collection: $slug,
            origins: $origins,
            merges: $merges,
            fills: $fills,
            books: $books,
            unresolved: $unresolved,
        );
    }

    /**
     * The validated chapters file of a collection, or null when there is neither a file nor a pin (ADR 0076 §2.3, step 6b.5).
     * A key whitelist at header and chapter level: a text or statistics field is refused (unknown_key).
     *
     * @throws HadithDataFileException with a code: bad_json, unknown_key, missing_key, schema_version, collection_mismatch,
     *                                 source_invalid, partial_books_invalid, chapter_invalid, chapter_order
     */
    public function chapters(string $slug): ?ChapterFile
    {
        $relativePath = 'chapters/'.$slug.'.json';
        $bytes = $this->readVerified($relativePath);

        if ($bytes === null) {
            return null;
        }

        $data = $this->decode($bytes, $relativePath);
        $this->assertKeys($data, ['schema_version', 'collection', 'source', 'release', 'doi', 'version_id', 'source_file_sha256', 'matcher_version', 'partial_books', 'licence', 'chapters'], $relativePath);

        if (($data['schema_version'] ?? null) !== 1) {
            throw new HadithDataFileException('Data file ['.$relativePath.'] has an unsupported schema_version (schema_version).');
        }

        if (($data['collection'] ?? null) !== $slug) {
            throw new HadithDataFileException('Data file ['.$relativePath.'] names another collection (collection_mismatch).');
        }

        if (($data['source'] ?? null) !== 'openiti') {
            throw new HadithDataFileException('Data file ['.$relativePath.'] names a source other than openiti (source_invalid).');
        }

        $release = $data['release'] ?? null;

        if (! is_string($release) || $release === '') {
            throw new HadithDataFileException('Data file ['.$relativePath.'] has no release (source_invalid).');
        }

        if (! in_array($data['partial_books'] ?? null, ['drop', 'keep'], true)) {
            throw new HadithDataFileException('Data file ['.$relativePath.'] has a partial_books value other than drop or keep (partial_books_invalid).');
        }

        return new ChapterFile(
            collection: $slug,
            release: $release,
            partialBooks: (string) $data['partial_books'],
            chapters: $this->chapterRecords($data['chapters'] ?? null, $relativePath),
        );
    }

    /**
     * The pinned SHA-256 of a data file, or null when it has no pin.
     */
    public function pin(string $relativePath): ?string
    {
        $this->assertPath($relativePath);

        $pins = config('hadith.data_files', []);
        $pin = is_array($pins) ? ($pins[$relativePath] ?? null) : null;

        return is_string($pin) ? $pin : null;
    }

    /**
     * The SHA-256 of the bytes on disk, or null when the file does not exist.
     */
    public function actualSha256(string $relativePath): ?string
    {
        $path = $this->absolutePath($relativePath);

        if (! is_file($path)) {
            return null;
        }

        $bytes = file_get_contents($path);

        return $bytes === false ? null : hash('sha256', $bytes);
    }

    /**
     * @return array<array-key, mixed>
     *
     * @throws HadithDataFileException
     */
    private function decode(string $bytes, string $relativePath): array
    {
        try {
            $data = json_decode($bytes, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new HadithDataFileException('Data file ['.$relativePath.'] is not valid JSON (bad_json).');
        }

        if (! is_array($data) || array_is_list($data)) {
            throw new HadithDataFileException('Data file ['.$relativePath.'] must hold a JSON object (bad_json).');
        }

        return $data;
    }

    /**
     * @param  array<array-key, mixed>  $data
     * @param  list<string>  $allowed
     *
     * @throws HadithDataFileException
     */
    private function assertKeys(array $data, array $allowed, string $relativePath): void
    {
        foreach (array_keys($data) as $key) {
            if (! in_array((string) $key, $allowed, true)) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] has an unknown top-level key (unknown_key).');
            }
        }

        foreach ($allowed as $key) {
            if (! array_key_exists($key, $data)) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] lacks the key ['.$key.'] (missing_key).');
            }
        }
    }

    /**
     * @return list<ChapterRecord>
     *
     * @throws HadithDataFileException
     */
    private function chapterRecords(mixed $value, string $relativePath): array
    {
        $chapters = [];
        $lastOrdinalByBook = [];

        foreach ($this->list($value, 'chapters', $relativePath) as $entry) {
            if (! is_array($entry)) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] holds a chapter that is not an object (chapter_invalid).');
            }

            $this->assertKeys($entry, ['ordinal', 'book_number', 'first', 'last', 'title_ar'], $relativePath);

            $ordinal = $entry['ordinal'];
            $bookNumber = $entry['book_number'];
            $first = $entry['first'];
            $last = $entry['last'];
            $titleAr = $entry['title_ar'];

            if (! is_int($ordinal) || $ordinal < 1 || ! $this->isNumberText($bookNumber) || strlen((string) $bookNumber) > 16 || ! $this->isNumberText($first) || ! $this->isNumberText($last)) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] holds a chapter with an invalid ordinal, book or range (chapter_invalid).');
            }

            if (! is_string($titleAr) || $titleAr === '') {
                throw new HadithDataFileException('Data file ['.$relativePath.'] holds a chapter with an empty title (chapter_invalid).');
            }

            if (isset($lastOrdinalByBook[$bookNumber]) && $ordinal <= $lastOrdinalByBook[$bookNumber]) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] holds ordinals of book ['.$bookNumber.'] that are not strictly increasing (chapter_order).');
            }

            $lastOrdinalByBook[$bookNumber] = $ordinal;
            $chapters[] = new ChapterRecord(ordinal: $ordinal, bookNumber: $bookNumber, first: $first, last: $last, titleAr: $titleAr);
        }

        return $chapters;
    }

    /**
     * @return array<string, string> origin code => source_version
     *
     * @throws HadithDataFileException
     */
    private function origins(mixed $value, string $relativePath): array
    {
        if (! is_array($value)) {
            throw new HadithDataFileException('Data file ['.$relativePath.'] origins must be an object (origin_unknown).');
        }

        $origins = [];

        foreach ($value as $code => $origin) {
            if (! in_array((string) $code, ['openiti', 'hadithapicom'], true) || ! is_array($origin) || ! is_string($origin['source_version'] ?? null) || $origin['source_version'] === '') {
                throw new HadithDataFileException('Data file ['.$relativePath.'] holds an origin that is not valid (origin_unknown).');
            }

            $origins[(string) $code] = $origin['source_version'];
        }

        return $origins;
    }

    /**
     * @param  array<string, string>  $origins
     * @return list<GapMerge>
     *
     * @throws HadithDataFileException
     */
    private function merges(mixed $value, array $origins, string $relativePath): array
    {
        $merges = [];

        foreach ($this->list($value, 'merges', $relativePath) as $merge) {
            if (! is_array($merge)) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] holds a merge that is not an object (merge_invalid).');
            }

            $number = $merge['number'] ?? null;
            $into = $merge['into'] ?? null;
            $origin = $merge['origin'] ?? null;

            if (! $this->isNumberText($number) || ! $this->isNumberText($into) || ! is_string($origin) || ! array_key_exists($origin, $origins)) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] holds a merge with a missing number, target or origin (merge_invalid).');
            }

            $merges[] = new GapMerge(number: $number, into: $into, origin: $origin);
        }

        return $merges;
    }

    /**
     * @param  array<string, string>  $origins
     * @return list<GapFill>
     *
     * @throws HadithDataFileException
     */
    private function fills(mixed $value, array $origins, string $slug, string $relativePath): array
    {
        $fills = [];

        foreach ($this->list($value, 'fills', $relativePath) as $entry) {
            $number = is_array($entry) ? ($entry['number'] ?? null) : null;
            $origin = is_array($entry) ? ($entry['origin'] ?? null) : null;

            if (! $this->isNumberText($number) || ! is_string($origin) || ! array_key_exists($origin, $origins)) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] holds a fill without a valid number or origin (fill_invalid).');
            }

            $sourceKey = $entry['source_key'] ?? null;
            $text = $entry['text_ar'] ?? null;
            $sha = $entry['source_text_sha256'] ?? null;
            $unit = $entry['unit'] ?? null;

            if (! is_string($sourceKey) || strlen($sourceKey) > 96 || $sourceKey !== $origin.':'.$slug.':'.$number) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] holds a fill whose source_key does not follow the rule for number ['.$number.'] (fill_key_invalid).');
            }

            if (! is_string($text) || $text === '' || ! mb_check_encoding($text, 'UTF-8')) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] holds a fill with an empty or invalid text for number ['.$number.'] (fill_text_invalid).');
            }

            if (! is_string($sha) || hash('sha256', $text) !== $sha) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] holds a fill whose SHA-256 does not match its text for number ['.$number.'] (fill_hash_mismatch).');
            }

            if ($unit !== null && ! is_int($unit)) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] holds a fill whose unit is not an integer (fill_invalid).');
            }

            $fills[] = new GapFill(number: $number, origin: $origin, sourceKey: $sourceKey, unit: $unit, text: $text, sourceTextSha256: $sha);
        }

        return $fills;
    }

    /**
     * @param  array<string, string>  $origins
     * @return list<GapBook>
     *
     * @throws HadithDataFileException
     */
    private function books(mixed $value, array $origins, string $relativePath): array
    {
        $books = [];

        foreach ($this->list($value, 'books', $relativePath) as $entry) {
            if (! is_array($entry)) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] holds a book that is not an object (book_invalid).');
            }

            $bookNumber = $entry['book_number'] ?? null;
            $afterBook = $entry['after_book'] ?? null;
            $first = $entry['first'] ?? null;
            $last = $entry['last'] ?? null;
            $titleAr = $entry['title_ar'] ?? null;
            $origin = $entry['origin'] ?? null;
            $sourceKey = $entry['source_key'] ?? null;

            if (($bookNumber !== null && ! $this->isNumberText($bookNumber)) || ! $this->isNumberText($afterBook) || ! $this->isNumberText($first) || ! $this->isNumberText($last)) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] holds a book with an invalid number or range (book_invalid).');
            }

            if (! is_string($titleAr) || $titleAr === '' || ! is_string($origin) || ! array_key_exists($origin, $origins) || ! is_string($sourceKey) || strlen($sourceKey) > 96) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] holds a book with a missing title, origin or source_key (book_invalid).');
            }

            $books[] = new GapBook(bookNumber: $bookNumber, afterBook: $afterBook, first: $first, last: $last, titleAr: $titleAr, origin: $origin, sourceKey: $sourceKey);
        }

        return $books;
    }

    /**
     * @return list<GapUnresolved>
     *
     * @throws HadithDataFileException
     */
    private function unresolved(mixed $value, string $relativePath): array
    {
        $unresolved = [];

        foreach ($this->list($value, 'unresolved', $relativePath) as $entry) {
            $number = is_array($entry) ? ($entry['number'] ?? null) : null;
            $reason = is_array($entry) ? ($entry['reason'] ?? null) : null;

            if (! $this->isNumberText($number)) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] holds an unresolved entry without a valid number (merge_invalid).');
            }

            if (! is_string($reason) || ! in_array($reason, self::UNRESOLVED_REASONS, true)) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] holds an unresolved number with a reason outside the closed set (reason_unknown).');
            }

            $unresolved[] = new GapUnresolved(number: $number, reason: $reason);
        }

        return $unresolved;
    }

    /**
     * @return list<mixed>
     *
     * @throws HadithDataFileException
     */
    private function list(mixed $value, string $key, string $relativePath): array
    {
        if (! is_array($value) || ($value !== [] && ! array_is_list($value))) {
            throw new HadithDataFileException('Data file ['.$relativePath.'] key ['.$key.'] must be a list (bad_json).');
        }

        return $value;
    }

    /**
     * @param  list<GapMerge>  $merges
     * @param  list<GapFill>  $fills
     * @param  list<GapUnresolved>  $unresolved
     *
     * @throws HadithDataFileException
     */
    private function assertNoRepeatedNumbers(array $merges, array $fills, array $unresolved, string $relativePath): void
    {
        $seen = [];
        $numbers = [
            ...array_map(static fn (GapMerge $merge): string => $merge->number, $merges),
            ...array_map(static fn (GapFill $fill): string => $fill->number, $fills),
            ...array_map(static fn (GapUnresolved $entry): string => $entry->number, $unresolved),
        ];

        foreach ($numbers as $number) {
            if (isset($seen[$number])) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] names number ['.$number.'] more than once (number_repeated).');
            }

            $seen[$number] = true;
        }
    }

    private function isNumberText(mixed $value): bool
    {
        return is_string($value) && $value !== '' && strlen($value) <= 32;
    }

    private function absolutePath(string $relativePath): string
    {
        $this->assertPath($relativePath);

        return $this->baseDirectory !== null
            ? rtrim($this->baseDirectory, '/').'/'.$relativePath
            : database_path('data/hadith/'.$relativePath);
    }

    /**
     * @throws HadithDataFileException
     */
    private function assertPath(string $relativePath): void
    {
        if (preg_match(self::PATH_PATTERN, $relativePath) !== 1) {
            throw new HadithDataFileException('Data file path ['.$relativePath.'] is outside the allowed folders (bad_path).');
        }
    }
}
