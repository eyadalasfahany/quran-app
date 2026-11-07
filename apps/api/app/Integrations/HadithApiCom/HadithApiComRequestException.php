<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiCom;

/**
 * A request failed after its last try. The previous exception is not chained: a transport error carries the URL, and the URL
 * carries the key.
 */
final class HadithApiComRequestException extends HadithApiComException
{
    public function __construct(string $message, public readonly ?int $status = null)
    {
        parent::__construct($message);
    }
}
