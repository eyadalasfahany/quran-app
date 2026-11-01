<?php

declare(strict_types=1);

namespace App\Integrations\Dorar;

final class DorarRequestException extends DorarException
{
    /**
     * The response body is never included: it may echo the token.
     */
    public function __construct(
        string $message,
        public readonly ?int $status = null,
    ) {
        parent::__construct($message);
    }
}
