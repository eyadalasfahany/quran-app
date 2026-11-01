<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Exceptions;

use RuntimeException;

/**
 * The pinned OpenDua catalogue could not be downloaded, or its bytes do not match the pin. Nothing is written.
 */
final class CatalogueDownloadException extends RuntimeException {}
