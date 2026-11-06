<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiFawaz;

/**
 * A request failed after its last try: a connection error, HTTP 429 or 5xx, or another 4xx. The previous exception is not
 * chained, because a transport error can carry headers.
 */
final class HadithApiFawazRequestException extends HadithApiFawazException
{
    public function __construct(string $message, public readonly ?int $status = null)
    {
        parent::__construct($message);
    }
}
