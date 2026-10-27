<?php

declare(strict_types=1);

namespace App\Integrations\QuranFoundation;

use Illuminate\Http\Client\Response;
use RuntimeException;
use Throwable;

final class QuranFoundationException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly ?int $status = null,
        public readonly ?string $type = null,
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    public static function missingCredentials(): self
    {
        return new self(
            'Quran Foundation client id and client secret are required.',
            type: 'missing_credentials',
        );
    }

    public static function invalidEnvironment(string $value): self
    {
        return new self(
            'QF environment ['.$value.'] must be prelive or production.',
            type: 'invalid_environment',
        );
    }

    public static function fromResponse(Response $response): self
    {
        $body = $response->json();
        $message = 'Quran Foundation request failed.';
        $type = null;

        if (is_array($body)) {
            if (isset($body['message']) && is_string($body['message']) && $body['message'] !== '') {
                $message = $body['message'];
            }

            if (isset($body['type']) && is_string($body['type']) && $body['type'] !== '') {
                $type = $body['type'];
            }
        }

        return new self($message, $response->status(), $type);
    }

    public static function unreachable(Throwable $previous): self
    {
        return new self(
            'Quran Foundation could not be reached.',
            type: 'connection_error',
            previous: $previous,
        );
    }

    /**
     * @return array{status: int|null, type: string|null}
     */
    public function context(): array
    {
        return [
            'status' => $this->status,
            'type' => $this->type,
        ];
    }
}
