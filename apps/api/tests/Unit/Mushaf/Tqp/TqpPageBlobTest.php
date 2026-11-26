<?php

declare(strict_types=1);

use App\Domains\Mushaf\Packs\Tqp\TqpEncoder;
use App\Domains\Mushaf\Packs\Tqp\TqpPageBlob;

const TQP_BLOB_FIXTURES = __DIR__.'/../../../Fixtures/mushaf/tqp';

it('builds a blob that is the container header and one raw deflate stream of the body', function (): void {
    $svg = file_get_contents(TQP_BLOB_FIXTURES.'/transforms.svg');
    $container = file_get_contents(TQP_BLOB_FIXTURES.'/transforms.container.bin');
    $built = TqpPageBlob::build($svg);
    $blob = $built['blob'];

    expect(substr($blob, 0, 18))->toBe(substr($container, 0, 18))
        ->and(gzinflate(substr($blob, 18)))->toBe(substr($container, 18))
        ->and($built['container_sha256'])->toBe(hash('sha256', $container))
        ->and($built['container_bytes'])->toBe(strlen($container));
});

it('uses level 9 deflate, raw rather than gzip or zlib framing', function (): void {
    $svg = file_get_contents(TQP_BLOB_FIXTURES.'/transforms.svg');
    $blob = TqpPageBlob::build($svg)['blob'];
    $body = substr((new TqpEncoder)->container($svg), 18);

    expect(strlen($blob))->toBeLessThanOrEqual(18 + strlen((string) gzdeflate($body, 6)))
        ->and(substr($blob, 18, 2))->not->toBe("\x1f\x8b")
        ->and(@gzdecode(substr($blob, 18)))->toBeFalse()
        ->and(@gzuncompress(substr($blob, 18)))->toBeFalse()
        ->and(substr($blob, 0, 4))->toBe('TQP1');
});
