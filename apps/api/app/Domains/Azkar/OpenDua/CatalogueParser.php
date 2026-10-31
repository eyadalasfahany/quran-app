<?php

declare(strict_types=1);

namespace App\Domains\Azkar\OpenDua;

use App\Domains\Azkar\Data\ParsedCatalogue;
use App\Domains\Azkar\Exceptions\CatalogueUnreadableException;
use JsonException;

/**
 * Reads the catalogue file as bytes, hashes it before any decoding, then decodes strict UTF-8 JSON.
 * Bytes are never re-encoded: the strings in the decoded array are the upstream strings (ADR 0031 §1, §4).
 */
final class CatalogueParser
{
    public function parse(string $path): ParsedCatalogue
    {
        if (! is_file($path) || ! is_readable($path)) {
            throw new CatalogueUnreadableException('unreadable_file', 'The catalogue file cannot be read.');
        }

        $bytes = file_get_contents($path);

        if ($bytes === false) {
            throw new CatalogueUnreadableException('unreadable_file', 'The catalogue file cannot be read.');
        }

        try {
            $data = json_decode($bytes, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            $code = $exception->getCode() === JSON_ERROR_UTF8 ? 'invalid_utf8' : 'invalid_json';

            throw new CatalogueUnreadableException($code, 'The catalogue is not valid UTF-8 JSON.');
        }

        if (! is_array($data) || array_is_list($data)) {
            throw new CatalogueUnreadableException('invalid_json', 'The catalogue root must be a JSON object.');
        }

        /** @var array<string, mixed> $data */
        return new ParsedCatalogue(
            path: $path,
            sha256: hash('sha256', $bytes),
            bytes: strlen($bytes),
            data: $data,
        );
    }
}
