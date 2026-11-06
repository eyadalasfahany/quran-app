<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiFawaz;

use RuntimeException;

/**
 * Base of every failure from the fawazahmed0 transport (ADR 0042 §3). Messages name a path or a config key, never content.
 */
class HadithApiFawazException extends RuntimeException {}
