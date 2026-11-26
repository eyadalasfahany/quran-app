<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Packs\Tqp;

use App\Domains\Mushaf\Exceptions\TqpEncodeException;

/**
 * The stored page blob: the container's 18-byte header, then the raw deflate (level 9) of its body (ADR 0090 amendment of 26 Nov 2026).
 */
final class TqpPageBlob
{
    /**
     * @return array{blob: string, container_sha256: string, container_bytes: int, origin_x: float, origin_y: float}
     *
     * @throws TqpEncodeException
     */
    public static function build(string $svg): array
    {
        $container = (new TqpEncoder)->container($svg);
        [$originX, $originY] = (new TqpPageScope)->viewBoxOrigin($svg);
        $body = gzdeflate(substr($container, TqpEncoder::HEADER_BYTES), 9);

        if ($body === false) {
            throw new TqpEncodeException('The page body could not be deflated.');
        }

        return [
            'blob' => substr($container, 0, TqpEncoder::HEADER_BYTES).$body,
            'container_sha256' => hash('sha256', $container),
            'container_bytes' => strlen($container),
            'origin_x' => $originX,
            'origin_y' => $originY,
        ];
    }
}
