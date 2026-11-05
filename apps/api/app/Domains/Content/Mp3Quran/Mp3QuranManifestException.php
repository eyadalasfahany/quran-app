<?php

declare(strict_types=1);

namespace App\Domains\Content\Mp3Quran;

use RuntimeException;

/**
 * The committed MP3Quran manifest is refused as a whole (missing, malformed or wrong schema). Nothing is written.
 */
final class Mp3QuranManifestException extends RuntimeException {}
