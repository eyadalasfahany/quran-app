<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiFawaz;

/**
 * The body is empty, larger than the cap, or shorter than its Content-Length (truncated).
 */
final class HadithApiFawazBodyException extends HadithApiFawazException {}
