<?php

declare(strict_types=1);

namespace App\Integrations\Dorar;

final class DorarRateLimitedException extends DorarException
{
    public function __construct(
        public readonly ?int $retryAfterSeconds = null,
    ) {
        parent::__construct('Dorar rate limit reached. Try again later.');
    }
}
