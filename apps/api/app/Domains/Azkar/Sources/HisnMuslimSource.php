<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Sources;

use App\Domains\Azkar\Data\ParsedCatalogue;
use App\Domains\Azkar\Exceptions\CatalogueUnreadableException;

/**
 * hisnmuslim.com (ADR 0031 §12). Reads a pinned snapshot directory written by `azkar:snapshot hisnmuslim`, verifies
 * every file against the snapshot manifest, and converts it to the catalogue shape the importer uses.
 *
 * Mapping: chapter number = index ID; title_ar = index TITLE, byte-exact; entry key = hisn-al-muslim-hm:<ID>; one
 * `standard` variation with one recitation item whose `times` is REPEAT, passed through unchanged so a missing or
 * non-positive REPEAT is a validation error. TRANSLATED_TEXT, the transliteration and AUDIO are not stored (ADR 0031 §12).
 */
final class HisnMuslimSource implements AzkarCatalogueSource
{
    public const string CODE = 'hisnmuslim';

    public const string COLLECTION_ID = 'hisn-al-muslim-hm';

    private const string INDEX_KEY = 'العربية';

    public function code(): string
    {
        return self::CODE;
    }

    public function profile(): SourceProfile
    {
        return new SourceProfile(
            code: self::CODE,
            version: (string) config('azkar.hisnmuslim.snapshot_date', ''),
            pinnedSha256: (string) config('azkar.hisnmuslim.snapshot_sha256', ''),
            collectionId: self::COLLECTION_ID,
            sourceKey: self::CODE,
            displayName: 'hisnmuslim.com',
        );
    }

    /**
     * @param  string  $location  A snapshot directory (storage/app/azkar/hisnmuslim/<date>).
     *
     * @throws CatalogueUnreadableException
     */
    public function parse(string $location): ParsedCatalogue
    {
        $manifest = $this->readJson($location.DIRECTORY_SEPARATOR.'manifest.json', 'The snapshot has no readable manifest.');
        $files = $manifest['files'] ?? null;
        $date = $manifest['date'] ?? null;
        $manifestSha = $manifest['sha256'] ?? null;

        if (! is_array($files) || ! is_string($date) || ! is_string($manifestSha)) {
            throw new CatalogueUnreadableException('invalid_structure', 'The snapshot manifest is missing its files, date or SHA-256.');
        }

        $bytes = 0;
        $hashes = [];
        $contents = [];

        foreach ($files as $name => $expected) {
            if (! is_string($name) || $name !== basename($name) || ! is_string($expected)) {
                throw new CatalogueUnreadableException('invalid_structure', 'The snapshot manifest lists a file name or hash that is not allowed.');
            }

            $path = $location.DIRECTORY_SEPARATOR.$name;
            $content = is_file($path) ? file_get_contents($path) : false;

            if ($content === false) {
                throw new CatalogueUnreadableException('snapshot_incomplete', 'A file listed in the snapshot manifest is missing.');
            }

            if (! hash_equals($expected, hash('sha256', $content))) {
                throw new CatalogueUnreadableException('snapshot_file_mismatch', 'A snapshot file does not match its manifest hash.');
            }

            $hashes[$name] = $expected;
            $contents[$name] = $content;
            $bytes += strlen($content);
        }

        ksort($hashes);

        if (! hash_equals($manifestSha, hash('sha256', (string) json_encode($hashes, JSON_THROW_ON_ERROR)))) {
            throw new CatalogueUnreadableException('snapshot_manifest_mismatch', 'The snapshot manifest does not match its whole-file SHA-256.');
        }

        $index = $this->decode($contents['index.json'] ?? null, 'index.json');
        $chapters = $index[self::INDEX_KEY] ?? null;

        if (! is_array($chapters) || ! array_is_list($chapters)) {
            throw new CatalogueUnreadableException('invalid_structure', 'The index does not list chapters under the expected key.');
        }

        return new ParsedCatalogue(
            path: $location,
            sha256: $manifestSha,
            bytes: $bytes,
            data: $this->convert($chapters, $contents, $date),
        );
    }

    /**
     * @param  list<mixed>  $chapters  The index chapters, in book order.
     * @param  array<string, string>  $contents  File contents by name, verified above.
     * @return array<string, mixed>
     *
     * @throws CatalogueUnreadableException
     */
    private function convert(array $chapters, array $contents, string $date): array
    {
        $collections = [['id' => self::COLLECTION_ID, 'title' => 'Hisn al-Muslim (hisnmuslim.com)', 'description' => '', 'chapterCount' => 0, 'entryCount' => 0]];
        $outChapters = [];
        $entries = [];
        $duas = [];
        // Browse tags follow the book's chapter numbering, from OpenDua's tags per chapter (config/azkar_chapter_tags.php).
        $chapterTags = config('azkar_chapter_tags', []);
        $chapterTags = is_array($chapterTags) ? $chapterTags : [];

        foreach ($chapters as $chapter) {
            $id = is_array($chapter) ? ($chapter['ID'] ?? null) : null;
            $title = is_array($chapter) ? ($chapter['TITLE'] ?? null) : null;

            if (! is_int($id) || $id < 1 || ! is_string($title)) {
                throw new CatalogueUnreadableException('invalid_structure', 'An index chapter has no numeric ID or no TITLE.');
            }

            $file = $id.'.json';
            $data = $this->decode($contents[$file] ?? null, $file);
            $list = array_values($data)[0] ?? null;

            if (! is_array($list) || ! array_is_list($list)) {
                throw new CatalogueUnreadableException('invalid_structure', 'A chapter file does not hold a list of entries.');
            }

            $chapterId = 'hm-chapter-'.$id;
            $outChapters[] = ['id' => $chapterId, 'number' => $id, 'title' => '', 'titleAr' => $title, 'entryCount' => count($list)];

            foreach ($list as $entry) {
                if (! is_array($entry) || ! is_int($entry['ID'] ?? null) || ! is_string($entry['ARABIC_TEXT'] ?? null)) {
                    throw new CatalogueUnreadableException('invalid_structure', 'A chapter entry has no numeric ID or no ARABIC_TEXT.');
                }

                $entryNumber = (string) $entry['ID'];
                $duaId = 'hm-'.$entryNumber;
                $duas[] = ['id' => $duaId, 'arabic' => $entry['ARABIC_TEXT']];
                $entries[] = [
                    'id' => $entryNumber,
                    'collectionId' => self::COLLECTION_ID,
                    'chapterId' => $chapterId,
                    'type' => 'invocation',
                    'title' => '',
                    'sourceReference' => $entryNumber,
                    'tags' => array_values($chapterTags[$id] ?? []),
                    'references' => [],
                    'variations' => [[
                        'id' => 'standard',
                        'steps' => [[
                            'type' => 'recitation',
                            'items' => [['dua' => ['id' => $duaId, 'arabic' => $entry['ARABIC_TEXT']], 'times' => $entry['REPEAT'] ?? null]],
                            'recordings' => [],
                        ]],
                    ]],
                ];
            }
        }

        $collections[0]['chapterCount'] = count($outChapters);
        $collections[0]['entryCount'] = count($entries);

        return [
            'schemaVersion' => 1,
            'dataVersion' => $date,
            'released' => $date,
            'defaultReciterId' => null,
            'counts' => ['collections' => 1, 'chapters' => count($outChapters), 'entries' => count($entries), 'duas' => count($duas), 'recordings' => 0],
            'licences' => [],
            'collections' => $collections,
            'chapters' => $outChapters,
            'entries' => $entries,
            'duas' => $duas,
            'reciters' => [],
            'referenceWorks' => [],
            'tags' => array_values(array_map(
                static fn (string $tag): array => ['id' => $tag],
                array_unique(array_merge([], ...array_values($chapterTags))),
            )),
        ];
    }

    /**
     * @return array<array-key, mixed>
     *
     * @throws CatalogueUnreadableException
     */
    private function decode(?string $bytes, string $name): array
    {
        if ($bytes === null) {
            throw new CatalogueUnreadableException('snapshot_incomplete', 'The snapshot file ['.$name.'] is missing.');
        }

        $body = str_starts_with($bytes, "\xEF\xBB\xBF") ? substr($bytes, 3) : $bytes;

        try {
            $data = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $exception) {
            $code = $exception->getCode() === JSON_ERROR_UTF8 ? 'invalid_utf8' : 'invalid_json';

            throw new CatalogueUnreadableException($code, 'The snapshot file ['.$name.'] is not valid UTF-8 JSON.');
        }

        if (! is_array($data)) {
            throw new CatalogueUnreadableException('invalid_json', 'The snapshot file ['.$name.'] does not hold a JSON object.');
        }

        return $data;
    }

    /**
     * @return array<array-key, mixed>
     *
     * @throws CatalogueUnreadableException
     */
    private function readJson(string $path, string $message): array
    {
        $bytes = is_file($path) ? file_get_contents($path) : false;

        if ($bytes === false) {
            throw new CatalogueUnreadableException('unreadable_file', $message);
        }

        return $this->decode($bytes, basename($path));
    }
}
