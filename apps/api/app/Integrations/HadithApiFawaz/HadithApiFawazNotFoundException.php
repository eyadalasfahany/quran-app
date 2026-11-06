<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiFawaz;

/**
 * The pinned commit does not hold the requested file (HTTP 404). Never retried.
 */
final class HadithApiFawazNotFoundException extends HadithApiFawazException {}
