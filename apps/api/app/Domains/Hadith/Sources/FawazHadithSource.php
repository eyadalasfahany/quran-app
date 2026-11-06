<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Sources;

use App\Domains\Hadith\Contracts\HadithCollectionSource;
use App\Domains\Hadith\Exceptions\HadithPinException;
use App\Domains\Hadith\Exceptions\HadithSourceFormatException;
use App\Domains\Hadith\Sources\Records\SourceCollection;
use App\Domains\Hadith\Sources\Records\SourceCollectionInfo;
use App\Domains\Hadith\Sources\Records\SourceGrade;
use App\Domains\Hadith\Sources\Records\SourceHadith;
use App\Domains\Hadith\Sources\Records\SourceSection;
use App\Integrations\HadithApiFawaz\HadithApiFawazClient;
use App\Integrations\HadithApiFawaz\HadithApiFawazException;
use InvalidArgumentException;

/**
 * The fawazahmed0/hadith-api adapter (ADR 0042 §3, §4). Reads only the pinned files, verifies every download before it is
 * stored, and keeps numbers and text exactly as received. It never decides whether a hadith is skipped (step 6 does).
 */
final class FawazHadithSource implements HadithCollectionSource
{
    private const string EDITIONS = 'editions.json';

    private const string INFO = 'info.json';

    /**
     * json_decode cannot keep a trailing zero (1.10 becomes 1.1), so such a number is refused before decoding.
     */
    private const string TRAILING_ZERO = '/"(?:hadithnumber|arabicnumber)"\s*:\s*-?\d+\.\d*0\s*[,}\]]/';

    public function __construct(
        private readonly HadithApiFawazClient $client,
        private readonly PinnedFileVerifier $verifier,
        private readonly SnapshotStore $store,
    ) {}

    public function code(): string
    {
        return (string) config('hadith.source_code');
    }

    public function version(): string
    {
        return (string) config('hadith.commit');
    }

    /**
     * @return list<string>
     */
    public function slugs(): array
    {
        $slugs = [];

        foreach ((array) config('hadith.collections') as $slug) {
            if (is_string($slug)) {
                $slugs[] = $slug;
            }
        }

        return $slugs;
    }

    /**
     * The fawazahmed0 slug for a canonical slug (D13): the slug_map key whose value is the canonical slug, else the slug itself.
     *
     * @throws InvalidArgumentException for a slug the source does not serve
     */
    public function sourceSlug(string $slug): string
    {
        $this->assertKnown($slug);

        $map = config('hadith.slug_map.fawazahmed0');

        if (is_array($map)) {
            foreach ($map as $sourceSlug => $canonical) {
                if ($canonical === $slug) {
                    return (string) $sourceSlug;
                }
            }
        }

        return $slug;
    }

    public function info(string $slug): SourceCollectionInfo
    {
        $sourceSlug = $this->sourceSlug($slug);
        $data = $this->decode(self::INFO, $this->bytes(self::INFO));
        $entry = $data[$sourceSlug] ?? null;
        $metadata = is_array($entry) ? ($entry['metadata'] ?? null) : null;
        $hadiths = is_array($entry) ? ($entry['hadiths'] ?? null) : null;

        if (! is_array($metadata) || ! is_array($hadiths)) {
            throw new HadithSourceFormatException('info.json has no usable entry for ['.$sourceSlug.'].');
        }

        $sections = $metadata['sections'] ?? [];

        return new SourceCollectionInfo(
            slug: $slug,
            sourceSlug: $sourceSlug,
            titleEn: $this->titleOf($metadata),
            lastHadithNumber: $this->numberText($metadata['last_hadithnumber'] ?? null, self::INFO),
            hadithCount: count($hadiths),
            sectionCount: is_array($sections) ? count($sections) : 0,
        );
    }

    public function collection(string $slug): SourceCollection
    {
        $sourceSlug = $this->sourceSlug($slug);
        $edition = 'ara-'.$sourceSlug;
        $path = 'editions/'.$edition.'.json';
        $data = $this->decode($path, $this->bytes($path));
        $metadata = $data['metadata'] ?? null;

        if (! is_array($metadata)) {
            throw new HadithSourceFormatException('['.$path.'] has no metadata.');
        }

        return new SourceCollection(
            slug: $slug,
            sourceSlug: $sourceSlug,
            editionName: $edition,
            titleEn: $this->titleOf($metadata),
            sections: $this->sectionsOf($metadata, $path),
            hadiths: $this->hadithsOf($data, $path),
        );
    }

    /**
     * Edition names per source slug, from editions.json. Returns what the file lists; collection() only reads ara-{slug}.
     *
     * @return array<string, list<string>>
     *
     * @throws HadithSourceFormatException
     */
    public function editionNames(): array
    {
        return $this->editionNamesFrom($this->bytes(self::EDITIONS));
    }

    /**
     * The same as editionNames() for bytes already in memory (the snapshotter checks freshly fetched bytes before caching).
     *
     * @return array<string, list<string>>
     *
     * @throws HadithSourceFormatException
     */
    public function editionNamesFrom(string $bytes): array
    {
        $data = $this->decode(self::EDITIONS, $bytes);
        $names = [];

        foreach ($data as $key => $entry) {
            $sourceSlug = (string) $key;
            $list = is_array($entry) ? ($entry['collection'] ?? null) : null;

            if (! is_array($list)) {
                throw new HadithSourceFormatException('editions.json has no edition list for ['.$sourceSlug.'].');
            }

            $names[$sourceSlug] = [];

            foreach ($list as $edition) {
                $name = is_array($edition) ? ($edition['name'] ?? null) : null;

                if (! is_string($name)) {
                    throw new HadithSourceFormatException('editions.json holds an edition without a name for ['.$sourceSlug.'].');
                }

                $names[$sourceSlug][] = $name;
            }
        }

        return $names;
    }

    /**
     * A verified cached copy is used without a request. A cached file that does not match is deleted. A download is verified
     * before it is written, so an unverified file is never stored by this method.
     *
     * @throws HadithPinException
     * @throws HadithApiFawazException
     */
    private function bytes(string $path): string
    {
        if ($this->store->has($path)) {
            $cached = $this->store->read($path);

            if ($this->verifier->matches($path, $cached)) {
                return $cached;
            }

            $this->store->delete($path);
        }

        $bytes = $this->client->fetch($path);
        $this->verifier->verify($path, $bytes);
        $this->store->write($path, $bytes);

        return $bytes;
    }

    /**
     * @param  array<array-key, mixed>  $metadata
     */
    private function titleOf(array $metadata): ?string
    {
        $name = $metadata['name'] ?? null;

        return is_string($name) && $name !== '' ? $name : null;
    }

    /**
     * @param  array<array-key, mixed>  $metadata
     * @return list<SourceSection>
     *
     * @throws HadithSourceFormatException
     */
    private function sectionsOf(array $metadata, string $path): array
    {
        $sections = $metadata['sections'] ?? null;
        $details = $metadata['section_details'] ?? [];

        if (! is_array($sections)) {
            throw new HadithSourceFormatException('['.$path.'] has no sections.');
        }

        if (! is_array($details)) {
            throw new HadithSourceFormatException('['.$path.'] has no usable section details.');
        }

        $result = [];

        foreach ($sections as $key => $name) {
            if ($name !== null && ! is_string($name)) {
                throw new HadithSourceFormatException('['.$path.'] has a section name that is not text.');
            }

            $detail = $details[$key] ?? null;
            $detail = is_array($detail) ? $detail : [];

            $result[] = new SourceSection(
                key: (string) $key,
                titleEn: is_string($name) && $name !== '' ? $name : null,
                firstHadithNumber: $this->numberText($detail['hadithnumber_first'] ?? null, $path),
                lastHadithNumber: $this->numberText($detail['hadithnumber_last'] ?? null, $path),
                firstArabicNumber: $this->numberText($detail['arabicnumber_first'] ?? null, $path),
                lastArabicNumber: $this->numberText($detail['arabicnumber_last'] ?? null, $path),
            );
        }

        return $result;
    }

    /**
     * @param  array<array-key, mixed>  $data
     * @return list<SourceHadith>
     *
     * @throws HadithSourceFormatException
     */
    private function hadithsOf(array $data, string $path): array
    {
        $hadiths = $data['hadiths'] ?? null;

        if (! is_array($hadiths)) {
            throw new HadithSourceFormatException('['.$path.'] has no hadith list.');
        }

        $result = [];

        foreach ($hadiths as $item) {
            $result[] = $this->hadithOf($item, $path);
        }

        return $result;
    }

    /**
     * @throws HadithSourceFormatException
     */
    private function hadithOf(mixed $item, string $path): SourceHadith
    {
        if (! is_array($item)) {
            throw new HadithSourceFormatException('['.$path.'] holds a hadith that is not an object.');
        }

        $number = $this->numberText($item['hadithnumber'] ?? null, $path);

        if ($number === null || $number === '') {
            throw new HadithSourceFormatException('['.$path.'] holds a hadith without a number.');
        }

        $text = null;

        if (array_key_exists('text', $item)) {
            if (! is_string($item['text'])) {
                throw new HadithSourceFormatException('['.$path.'] holds a hadith whose text is not text.');
            }

            $text = $item['text'];
        }

        $reference = $item['reference'] ?? [];
        $reference = is_array($reference) ? $reference : [];

        return new SourceHadith(
            number: $number,
            arabicNumber: $this->numberText($item['arabicnumber'] ?? null, $path),
            text: $text,
            grades: $this->gradesOf($item['grades'] ?? [], $path),
            referenceBook: $this->numberText($reference['book'] ?? null, $path),
            referenceHadith: $this->numberText($reference['hadith'] ?? null, $path),
        );
    }

    /**
     * @return list<SourceGrade>
     *
     * @throws HadithSourceFormatException
     */
    private function gradesOf(mixed $grades, string $path): array
    {
        if (! is_array($grades)) {
            throw new HadithSourceFormatException('['.$path.'] holds grades that are not a list.');
        }

        $result = [];

        foreach ($grades as $grade) {
            $grade = is_array($grade) ? $grade : [];

            if (! is_string($grade['grade'] ?? null)) {
                throw new HadithSourceFormatException('['.$path.'] holds a grade without text.');
            }

            $gradedBy = $grade['name'] ?? null;
            $result[] = new SourceGrade(
                gradedBy: is_string($gradedBy) ? $gradedBy : null,
                grade: $grade['grade'],
            );
        }

        return $result;
    }

    /**
     * Keeps a number as text. A float keeps its shortest round-trip form (2787.2 stays 2787.2).
     *
     * @throws HadithSourceFormatException
     */
    private function numberText(mixed $value, string $path): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_int($value) || is_float($value) || is_string($value)) {
            return (string) $value;
        }

        throw new HadithSourceFormatException('['.$path.'] holds a number that is not a number.');
    }

    /**
     * Strips a leading BOM in memory only, refuses a trailing-zero hadith number, then decodes.
     *
     * @return array<array-key, mixed>
     *
     * @throws HadithSourceFormatException
     */
    private function decode(string $path, string $bytes): array
    {
        $body = str_starts_with($bytes, "\xEF\xBB\xBF") ? substr($bytes, 3) : $bytes;

        if (preg_match(self::TRAILING_ZERO, $body) === 1) {
            throw new HadithSourceFormatException('A hadith number in ['.$path.'] would lose a trailing zero; the parser must be extended.');
        }

        try {
            $data = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new HadithSourceFormatException('['.$path.'] is not valid UTF-8 JSON.');
        }

        if (! is_array($data)) {
            throw new HadithSourceFormatException('['.$path.'] is not valid UTF-8 JSON.');
        }

        return $data;
    }

    /**
     * @throws InvalidArgumentException before any file access
     */
    private function assertKnown(string $slug): void
    {
        if (! in_array($slug, $this->slugs(), true)) {
            throw new InvalidArgumentException('Unknown Hadith collection ['.$slug.'].');
        }
    }
}
