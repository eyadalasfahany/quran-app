<?php

declare(strict_types=1);

namespace App\Domains\Content\Timings;

use RuntimeException;

/**
 * A committed timing file that cannot be read. The message is a short reason; the importer reports it as a skip.
 */
final class TaybahTimingFileException extends RuntimeException {}
