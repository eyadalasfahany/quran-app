<?php

declare(strict_types=1);

namespace App\Integrations\Dorar;

final class DorarMappingUnavailableException extends DorarException
{
    public static function awaitingApiDocumentation(): self
    {
        return new self(
            'Dorar response mapping is not available until the Dorar API documentation is added. See docs/plans/phase-6/step-09-dorar-adapter.md.',
        );
    }
}
