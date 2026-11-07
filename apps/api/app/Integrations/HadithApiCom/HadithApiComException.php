<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiCom;

use RuntimeException;

/**
 * Base of every failure from the hadithapi.com title source (dev-only, ADR 0042 §4a). Messages name a label or a config key,
 * never a URL, the key or a response body.
 */
class HadithApiComException extends RuntimeException {}
