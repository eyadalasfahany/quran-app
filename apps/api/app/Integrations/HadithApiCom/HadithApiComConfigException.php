<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiCom;

/**
 * The title source is disabled in production, has no key, or its config is malformed. The message names a config key or the
 * environment variable name, never a value.
 */
final class HadithApiComConfigException extends HadithApiComException {}
