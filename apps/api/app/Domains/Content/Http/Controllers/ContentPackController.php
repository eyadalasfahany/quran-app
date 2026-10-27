<?php

declare(strict_types=1);

namespace App\Domains\Content\Http\Controllers;

use App\Domains\Content\Services\ContentDeliveryService;
use App\Http\Controllers\Controller;
use Dedoc\Scramble\Attributes\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

final class ContentPackController extends Controller
{
    public function __construct(private readonly ContentDeliveryService $delivery) {}

    #[Response(404, 'The resource or pack version was not found.', mediaType: 'application/problem+json', type: '\App\Support\ProblemDetails\ProblemDetailsResource')]
    public function show(int $resource, int $version): BinaryFileResponse
    {
        $pack = $this->delivery->pack($resource, $version);

        return response()->file($this->delivery->absolutePath($pack), [
            'Content-Type' => 'application/gzip',
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'ETag' => '"'.$pack->sha256.'"',
        ]);
    }
}
